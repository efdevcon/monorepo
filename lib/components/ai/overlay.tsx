import React from "react";
import Image from "next/image";
import Link from "next/link";
import DevaHead from "./deva.png";
import { Button } from "lib/components/button";
import CloseIcon from "../../assets/icons/cross.svg";
import AppIcon from "../../assets/icons/app-icons.svg";
import AppIconOne from "../../assets/icons/app-icons-1.svg";
import ChevronRight from "../../assets/icons/chevron_right.svg";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "lib/components/loader";
import { useRecoilState, useResetRecoilState, atom } from "recoil";
import { CircleIcon } from "lib/components/circle-icon";
import { FancyLoader } from "lib/components/loader/loader";
import { Separator } from "lib/components/ui/separator";
import { useDraggableLink } from "lib/components/link/Link";
import SwipeToScroll from "lib/components/event-schedule/swipe-to-scroll";
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
import cn from "classnames";

const Trigger = ({ className }: { className?: string }) => {
  return (
    <svg
      width="81"
      height="32"
      viewBox="0 0 81 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M0.497656 14.2H5.51366C11.4417 14.2 15.0897 17.392 15.0897 22.6C15.0897 27.808 11.4417 31 5.51366 31H0.497656V14.2ZM4.33766 27.64H5.51366C8.96966 27.64 11.0817 25.72 11.0817 22.6C11.0817 19.48 8.96966 17.56 5.51366 17.56H4.33766V27.64ZM22.7595 17.56V20.68H29.4075V24.04H22.7595V27.64H30.3675V31H18.9195V14.2H30.3675V17.56H22.7595ZM38.653 31L32.533 14.2H36.853L40.837 26.488L44.773 14.2H49.093L42.973 31H38.653ZM65.892 28.192H55.356L53.916 31H49.62L58.284 14.2H62.796L71.724 31H67.38L65.892 28.192ZM64.14 24.856L60.588 18.232L57.084 24.856H64.14Z"
        fill="black"
      />
      <path d="M74.4195 31V14.2H78.4995V31H74.4195Z" fill="#7D52F4" />
      <path
        d="M8.33469 7.596H3.06669L2.34669 9H0.198688L4.53069 0.599999H6.78669L11.2507 9H9.07869L8.33469 7.596ZM7.45869 5.928L5.68269 2.616L3.93069 5.928H7.45869ZM17.1973 3.972C20.0653 4.236 21.5413 4.488 21.5413 6.684C21.5413 8.232 20.5213 9.216 17.4853 9.216H16.2853C13.0093 9.216 12.0732 8.28 12.0613 6.144H14.2093C14.1733 7.092 14.5573 7.56 16.8253 7.56H17.0653C19.0213 7.56 19.4413 7.38 19.4413 6.684C19.4413 5.88 18.2893 5.772 16.3093 5.58C14.0653 5.364 12.2533 4.872 12.2533 2.928C12.2533 1.248 13.2253 0.383999 16.3093 0.383999H17.5093C20.1493 0.383999 21.3733 1.512 21.3853 3.444H19.2373V3.468C19.2373 2.46 18.6853 2.04 16.9693 2.04H16.7293C14.7013 2.04 14.3413 2.232 14.3413 2.868C14.3413 3.6 15.5773 3.816 17.1973 3.972ZM21.3853 3.444V3.468V3.444ZM14.2093 6.108V6.144V6.108ZM12.0613 6.144V6.12V6.144ZM23.5203 9V0.599999H25.5603V3.804H28.9923L31.3083 0.599999H33.6963L30.7803 4.608L33.7083 9H31.2843L28.9563 5.544L25.5603 5.532V9H23.5203Z"
        fill="black"
      />
    </svg>
  );
};

const DevaBot = ({
  recommendationMode,
  sessions,
}: {
  recommendationMode?: boolean;
  sessions?: any;
}) => {
  const [visible, setVisible] = useRecoilState(visibleState);
  const [query, setQuery] = useRecoilState(queryState);
  const [executingQuery, setExecutingQuery] =
    useRecoilState(executingQueryState);
  const [error, setError] = useRecoilState(errorState);
  const [threadID, setThreadID] = useRecoilState(threadIDState);
  const [messages, setMessages] = useRecoilState(messagesState);
  const textareaRef = React.useRef<HTMLInputElement>(null);
  const draggable = useDraggableLink();

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
  // const [partialChunk, setPartialChunk] = React.useState("");

  const onSend = async () => {
    if (executingQuery) return;

    setExecutingQuery(true);
    setStreamingMessage("");
    // setPartialChunk("");

    try {
      let url =
        process.env.NODE_ENV === "development"
          ? "http://localhost:4000/devabot"
          : "https://api.devcon.org/devabot";
      if (recommendationMode) {
        url += "?recommendations=true";
      }
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message: query, threadID }),
      });

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

        // console.log(value, "value");

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
              className="absolute bottom-0 top-0 right-0 z-10 h-[100dvh] w-[390px] max-w-full lg:max-w-auto bg-[#FDFDFF] shadow-xl p-4 pb-[env(safe-area-inset-bottom)] flex flex-col gap-0 items-start overflow-hidden"
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
              <div className="flex flex-col gap-2 shrink-0 w-full mb-2">
                <div className="flex justify-between w-full">
                  <div className="shrink-0 bold">
                    <Trigger className="w-[70px]" />
                  </div>

                  <CircleIcon onClick={() => setVisible(false)}>
                    <CloseIcon />
                  </CircleIcon>
                </div>
              </div>

              <div className="relative flex flex-col grow w-full gap-4 no-scrollbar">
                <div className="relative overflow-auto flex flex-col grow w-full gap-4 no-scrollbar pb-10">
                  {messages &&
                    messages.length > 0 &&
                    messages.map((message: any, index: any) => {
                      const isAssistantReply = message.role === "assistant";

                      return (
                        <div key={index} className="shrink-0 flex flex-col">
                          {/* <span
                            className={cn("text-sm opacity-50", {
                              "text-left self-start": isAssistantReply,
                              "text-right self-end": !isAssistantReply,
                            })}
                          >
                            {message.role === "assistant"
                              ? "DevAI responded"
                              : "You asked"}
                          </span> */}
                          <Markdown
                            className={cn("markdown p-3 py-2 w-auto", {
                              "mr-4 bg-[#F0F2FF] rounded-tl-xl rounded-tr-xl rounded-br-xl text-left self-start":
                                isAssistantReply,
                              "ml-4 bg-[#7D52F4] text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl self-end":
                                !isAssistantReply,
                            })}
                          >
                            {
                              message.text.split(
                                "System: The current date is:"
                              )[0]
                            }
                          </Markdown>

                          {message.files.length > 0 && (
                            <div className="flex flex-col text-sm opacity-50 ">
                              <p className="mt-1">References</p>
                              <div className="flex gap-2 flex-wrap">
                                {(() => {
                                  const referencesTracker = {} as any;

                                  return message.files.map(
                                    ({ file, fileUrl }: any, index: number) => {
                                      if (recommendationMode) {
                                        const sessionId = file.filename
                                          .split("session_")[1]
                                          .split(".json")[0];

                                        if (!sessionId) return null;

                                        const session = sessions.find(
                                          (session: any) =>
                                            session.id === sessionId
                                        );

                                        return (
                                          <div key={index}>{session.title}</div>
                                        );
                                      }

                                      if (fileUrl) {
                                        if (referencesTracker[file.fileUrl])
                                          return null;

                                        referencesTracker[file.fileUrl] = true;
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

                  {!executingQuery &&
                    !streamingMessage &&
                    messages &&
                    messages.length === 0 && (
                      <div className="mt-2">
                        <div className="flex flex-col gap-1 p-4 bg-[#F0F2FF] rounded-lg">
                          <p className="font-bold text-sm">
                            Experimental Feature
                          </p>
                          <p className="text-xs">
                            This is an MVP and Deva may sometimes provide
                            answers that are not true - we take no
                            responsibility for, or endorse, anything Deva says
                            beyond Event information.
                          </p>
                        </div>
                      </div>
                    )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>

                <div className="absolute right-0 bottom-2">
                  <FancyLoader loading={executingQuery} size={60} />
                </div>
              </div>

              {!executingQuery &&
                !streamingMessage &&
                messages &&
                messages.length === 0 && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg w-full flex items-center justify-center px-4 text-center flex-col gap-8">
                    <div className="icon">
                      <FancyLoader loading={true} dontAnimate />
                      {/* <AppIcon style={{ fontSize: "50px" }} /> */}
                    </div>
                    <p className="font-semibold w-[250px]">
                      Ask me anything related to Devcon SEA.
                    </p>
                  </div>
                )}

              {/* <div
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
              </div> */}

              {/* <div className="shrink-0 relative w-full flex flex-col rounded overflow-hidden mb-2">
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
                      className="bg-teal-500 text-white px-2 py-1 rounded text-xs plain"
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
                          className="plain"
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
                      className="plain"
                      color="teal-1"
                      fill
                      onClick={onSend}
                      disabled={executingQuery}
                    >
                      Ask Deva
                    </Button>

                    <Button
                      className="plain"
                      color="black-1"
                      fill
                      disabled={executingQuery}
                      onClick={reset}
                    >
                      Clear Chat
                    </Button>
                  </div>
                </div> */}
              <div
                className={cn({
                  hidden: executingQuery || messages.length > 0,
                })}
              >
                <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
                  <div className="flex">
                    <div
                      className={`flex flex-wrap gap-2 py-2 shrink-0 ${
                        messages.length > 0 ? "hidden" : ""
                      }`}
                    >
                      {[
                        "What should I do at Devcon?",
                        "What is Devcon?",
                        "When is Devcon?",
                        "How can I participate?",
                        "Why Bangkok?",
                        "Can I apply to speak?",
                        "Can I volunteer?",
                      ].map((suggestion, index, array) => (
                        <Button
                          key={index}
                          {...draggable}
                          className={`!text-black px-2 !py-1.5 !px-3 rounded text-xs plain border-none shadow bg-gray-100 ${
                            index === array.length - 1 ? "mr-4" : ""
                          }`}
                          fat
                          onClick={() => {
                            setQuery(suggestion);
                            textareaRef.current?.focus();
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                </SwipeToScroll>
              </div>

              <Separator className="mb-2" />

              <div
                className={cn(
                  "shrink-0 flex items-center justify-center gap-1 my-3 mt-1.5 w-full relative",
                  { "mt-0": executingQuery || messages.length > 0 }
                )}
              >
                <div className="icon mr-1">
                  <AppIconOne />
                </div>
                <div className={cn("grow relative")}>
                  <input
                    className={cn(
                      "w-full py-3 h-[35px] px-4 pr-10 bg-[#F0F2FF] rounded-full placeholder-[#747474] focus:outline-none",
                      {
                        "opacity-50": executingQuery,
                      }
                    )}
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !executingQuery) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    type="text"
                    placeholder="Ask me anything..."
                  />
                  <div
                    className={cn(
                      "absolute right-4 top-1/2 transform -translate-y-1/2 focus:outline-none hover:scale-110 transition-all duration-150 cursor-pointer",
                      {
                        "opacity-50": executingQuery,
                      }
                    )}
                    onClick={() => {
                      setQuery("");
                      textareaRef.current?.focus();
                    }}
                  >
                    <CloseIcon style={{ fontSize: "10px", fill: "#646E83" }} />
                  </div>
                </div>

                <div>
                  <CircleIcon
                    className={cn(
                      "mx-1 h-[34px] w-[34px] text-2xl bg-[#F0F2FF]",
                      {
                        "opacity-50": executingQuery,
                      }
                    )}
                    onClick={onSend}
                    disabled={executingQuery}
                  >
                    <ChevronRight
                      className="text-lg"
                      style={{ fontSize: "12px" }}
                    />
                  </CircleIcon>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onClick={() => setVisible(!visible)}
        className="section cursor-pointer"
      >
        <Trigger />
      </div>

      {/* <Button
        className="plain"
        className="bold"
        color="blue-1"
        fill
        onClick={() => setVisible(!visible)}
      >
        <span className="md:hidden block">Questions?</span>
        <span className="hidden md:block">Questions? Ask here 🦄</span>
      </Button> */}
    </>
  );
};

export default DevaBot;
