import React from "react";
import Image from "next/image";
import Link from "next/link";
import DevaHead from "./deva.png";
import { Button } from "lib/components/button";
import CloseIcon from "../../assets/icons/cross.svg";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "lib/components/loader";
import { useRecoilState, useResetRecoilState, atom } from "recoil";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "lib/components/ui/popover";
import {
  visibleState,
  queryState,
  executingQueryState,
  errorState,
  threadIDState,
  messagesState,
} from "./state"; // Adjust the import path
import { InfoIcon } from "tinacms";

const DevaBot = () => {
  const [visible, setVisible] = useRecoilState(visibleState);
  const [query, setQuery] = useRecoilState(queryState);
  const [executingQuery, setExecutingQuery] =
    useRecoilState(executingQueryState);
  const [error, setError] = useRecoilState(errorState);
  const [threadID, setThreadID] = useRecoilState(threadIDState);
  const [messages, setMessages] = useRecoilState(messagesState);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const resetMessages = useResetRecoilState(messagesState);
  const resetThreadID = useResetRecoilState(threadIDState);

  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  React.useEffect(() => {
    setError("");
  }, [query]);

  const reset = () => {
    resetThreadID();
    resetMessages();
  };

  const [streamingMessage, setStreamingMessage] = React.useState("");
  const [partialChunk, setPartialChunk] = React.useState("");

  const onSend = async () => {
    if (executingQuery) return;

    setExecutingQuery(true);
    setStreamingMessage("");
    setPartialChunk("");

    try {
      const response = await fetch(
        process.env.NODE_ENV === "development"
          ? "http://localhost:4000/devabot"
          : "https://api.devcon.org/devabot",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ message: query, threadID }),
        }
      );

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      let buffer = "";
      const chunkDelimiter = "_chunk_end_";

      const processChunk = (chunk: string) => {
        try {
          const response = JSON.parse(chunk);

          if (response.error) {
            setError(response.error);
            setExecutingQuery(false);
            return;
          }

          if (response.type === "thread.message.delta") {
            setStreamingMessage((prev) => prev + response.content);
          }

          if (response.type === "done") {
            setThreadID(response.threadID);
            setMessages(response.messages);
            setStreamingMessage("");
            setExecutingQuery(false);
          }
        } catch (parseError) {
          console.error("Error parsing chunk:", parseError);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        console.log(value, "value");

        buffer += value;

        let delimiterIndex;

        while ((delimiterIndex = buffer.indexOf(chunkDelimiter)) !== -1) {
          const chunk = buffer.slice(0, delimiterIndex);
          processChunk(chunk);
          buffer = buffer.slice(delimiterIndex + chunkDelimiter.length);
        }
      }

      // Process any remaining data in the buffer
      if (buffer.length > 0) {
        processChunk(buffer);
      }
    } catch (e: any) {
      console.error(e, "error");
      setError("An error occurred: " + e.message);
      setExecutingQuery(false);
    }
  };

  React.useEffect(() => {
    // reset the query when the executing query is false
    if (!executingQuery && !error) {
      setQuery("");
    }
  }, [executingQuery]);

  React.useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [visible]);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed bottom-0 right-0 left-0 top-0 z-[1000000000]"
            onClick={() => setVisible(false)}
            initial={{
              background: "#00000000",
            }}
            animate={{
              background: "#00000095",
            }}
            exit={{
              background: "#00000000",
            }}
            transition={{
              duration: 0.35,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 top-0 right-0 z-10 h-[100dvh] w-[25vw] min-w-[325px] max-w-full bg-slate-900 shadow-xl p-4 pb-[env(safe-area-inset-bottom)] text-white flex flex-col gap-2 items-start"
              initial={{
                x: "100%",
              }}
              animate={{
                x: "0%",
              }}
              exit={{
                x: "100%",
              }}
              transition={{
                duration: 0.35,
              }}
            >
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex justify-between w-full">
                  <div className="shrink-0 bold">Deva 🦄 Chat</div>
                  <div
                    className="cursor-pointer p-4 pt-5 absolute right-0 top-0 flex justify-center items-center"
                    onClick={() => setVisible(false)}
                    // @ts-ignore
                    style={{ "--color-icon": "white", fontSize: "12px" }}
                  >
                    <CloseIcon />
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col grow w-full gap-4 no-scrollbar">
                <div className="relative overflow-auto flex flex-col grow w-full gap-4 no-scrollbar pb-10">
                  {messages &&
                    messages.length > 0 &&
                    messages.map((message: any, index: any) => {
                      return (
                        <div key={index} className="shrink-0 flex flex-col">
                          <span className="text-sm opacity-50">
                            {message.role === "assistant"
                              ? "DevAI responded"
                              : "You asked"}
                          </span>
                          <Markdown className="markdown">
                            {
                              message.text.split(
                                "System: The current date is:"
                              )[0]
                            }
                          </Markdown>

                          {message.files.length > 0 && (
                            <div className="flex flex-col text-sm opacity-50 ">
                              <p className="mt-1">References</p>
                              <div className="flex gap-2">
                                {(() => {
                                  const referencesTracker = {} as any;

                                  return message.files.map(
                                    ({ file, fileUrl }: any, index: number) => {
                                      if (referencesTracker[file.fileUrl])
                                        return null;

                                      referencesTracker[file.fileUrl] = true;

                                      if (fileUrl) {
                                        return (
                                          <Link href={fileUrl} key={index}>
                                            https://devcon.org{fileUrl}
                                          </Link>
                                        );
                                      } else {
                                        return (
                                          <div key={index}>{file.filename}</div>
                                        );
                                      }
                                    }
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {streamingMessage && (
                    <div className="shrink-0 flex flex-col">
                      <span className="text-sm opacity-50">
                        Deva is responding...
                      </span>
                      <Markdown className="markdown">
                        {streamingMessage}
                      </Markdown>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
              </div>

              <div
                className={`text-red-500 text-xs shrink-0 ${
                  messages.length > 0 ? "hidden" : ""
                }`}
              >
                This is an MVP and Deva may rarely provide answers that are not
                true - we take no responsibility for, or endorse, anything Deva
                says{"  "}
                <Popover>
                  <PopoverTrigger>ℹ️</PopoverTrigger>
                  <PopoverContent>
                    <div className="text-xs">
                      We currently use OpenAI due to the ease of use and mature
                      APIs, but are actively working on an open source
                      alternative. We welcome contributions to this effort on
                      the{" "}
                      <Link
                        href="https://github.com/efdevcon/monorepo"
                        className="generic"
                      >
                        Devcon repository.
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="shrink-0 relative w-full flex bg-slate-800 flex-col rounded overflow-hidden mb-2">
                <div className="absolute flex items-center opacity-0 w-5/6 right-0 translate-x-[60%] translate-y-[22%] bottom-0 h-full pointer-events-none">
                  <Image src={DevaHead} alt="Deva" className="object-cover" />
                </div>

                <textarea
                  className={`relative w-full h-full outline-none p-2 pb-4 bg-transparent z-2 no-scrollbar ${
                    isTouchDevice ? "text-base" : "text-sm"
                  }`}
                  ref={textareaRef}
                  style={{
                    resize: "none",
                    ...(isTouchDevice && {
                      fontSize: "16px",
                      WebkitTextSizeAdjust: "100%",
                      WebkitTapHighlightColor: "transparent",
                    }),
                  }}
                  value={query}
                  placeholder="Ask DevAI about Devcon here!"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !executingQuery) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                ></textarea>

                <div
                  className={`flex flex-wrap gap-2 p-2 shrink-0 ${
                    messages.length > 0 ? "hidden" : ""
                  }`}
                >
                  {[
                    "What is Devcon?",
                    "When is Devcon?",
                    "How can I participate?",
                    "Why Bangkok?",
                    "Can I apply to speak?",
                    "Can I volunteer?",
                  ].map((suggestion, index) => (
                    <Button
                      key={index}
                      className="bg-teal-500 text-white px-2 py-1 rounded text-xs"
                      onClick={() => {
                        setQuery(suggestion);
                        textareaRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>

                <div
                  className={`flex absolute w-full h-full bg-slate-800 ${
                    executingQuery || error
                      ? "bg-opacity-90 pointer-events-auto"
                      : "bg-opacity-0 pointer-events-none"
                  } z-10 items-center justify-center`}
                >
                  <div className="flex flex-col items-center justify-center w-full">
                    {executingQuery && (
                      <Loader className="">
                        <div className="text-xs opacity-70">
                          Deva is thinking...
                        </div>
                      </Loader>
                    )}
                    {error && (
                      <div className="text-red-500 p-4 flex flex-col gap-2">
                        {error}
                        <Button
                          onClick={() => setError("")}
                          color="purple-1"
                          fill
                        >
                          OK
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 w-full m-2 mt-0 shrink-0">
                  {!("ontouchstart" in window) && (
                    <p className="text-xs opacity-30">
                      Enter to submit. Shift+Enter for newline.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      color="teal-1"
                      fill
                      onClick={onSend}
                      disabled={executingQuery}
                    >
                      Ask Deva
                    </Button>

                    <Button
                      color="black-1"
                      fill
                      disabled={executingQuery}
                      onClick={reset}
                    >
                      Clear Chat
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        className="bold"
        color="blue-1"
        fill
        onClick={() => setVisible(!visible)}
      >
        <span className="md:hidden block">Questions?</span>
        <span className="hidden md:block">Questions? Ask here 🦄</span>
      </Button>
    </>
  );
};

export default DevaBot;
