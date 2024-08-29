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
  visibleState,
  queryState,
  executingQueryState,
  errorState,
  threadIDState,
  messagesState,
} from "./state"; // Adjust the import path

const DevaBot = () => {
  const [visible, setVisible] = useRecoilState(visibleState);
  const [query, setQuery] = useRecoilState(queryState);
  const [executingQuery, setExecutingQuery] =
    useRecoilState(executingQueryState);
  const [error, setError] = useRecoilState(errorState);
  const [threadID, setThreadID] = useRecoilState(threadIDState);
  const [messages, setMessages] = useRecoilState(messagesState);

  const resetMessages = useResetRecoilState(messagesState);
  const resetThreadID = useResetRecoilState(threadIDState);

  React.useEffect(() => {
    setError("");
  }, [query]);

  const reset = () => {
    resetThreadID();
    resetMessages();
  };

  const onSend = async () => {
    if (executingQuery) return;

    setExecutingQuery(true);

    try {
      let url = "/api/ai";

      const result = await (
        await fetch(url, {
          method: "POST",
          body: JSON.stringify({ message: query, threadID }),
        })
      ).json();

      setThreadID(result.threadID);
      setMessages(result.messages);
    } catch (e: any) {
      console.error(e, "error");
      setError(e.message);
    }

    setExecutingQuery(false);
  };

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
              className="fixed bottom-0 right-0 z-10 h-[100vh] w-[25vw] min-w-[300px] max-w-full bg-slate-900 shadow-xl p-4 text-white flex flex-col gap-4 items-start"
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
                  <div className="shrink-0 bold">DevAI Chat</div>
                  <div
                    className="cursor-pointer p-4 pt-5 absolute right-0 top-0 flex justify-center items-center"
                    onClick={() => setVisible(false)}
                    // @ts-ignore
                    style={{ "--color-icon": "white", fontSize: "12px" }}
                  >
                    <CloseIcon />
                  </div>
                </div>

                <div className="text-red-500 text-xs">
                  Disclaimer: This is an experimental feature and the AI may
                  rarely provide answers that are not true - we take no
                  responsibility for, or endorse, anything the AI says.
                </div>
              </div>

              <div className="overflow-auto flex flex-col grow w-full gap-4">
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
              </div>

              <div className="shrink-0 relative w-full flex bg-slate-800 flex-col gap-2 overflow-hidden">
                <div className="absolute flex items-center opacity-50 w-5/6 right-0 translate-x-[60%] translate-y-[22%] bottom-0 h-full">
                  <Image src={DevaHead} alt="Deva" className="object-cover" />
                </div>

                <textarea
                  className="relative text w-full h-full outline-none p-2 bg-transparent z-2"
                  style={{ resize: "none" }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                ></textarea>

                <div className="ml-2 flex">
                  {executingQuery && (
                    <Loader className="">
                      <div className="text-xs opacity-80">
                        DevAI is thinking...
                      </div>
                    </Loader>
                  )}
                  {error && <div className="text-red-500">{error}</div>}
                </div>

                <div className="flex gap-2 w-full m-2 shrink-0">
                  <Button
                    className="grow-1 shrink-0 bold"
                    color="purple-1"
                    fill
                    onClick={onSend}
                    disabled={executingQuery}
                  >
                    Ask DevAI
                  </Button>

                  <Button
                    color="purple-1"
                    fill
                    disabled={executingQuery}
                    onClick={reset}
                  >
                    Clear Chat
                  </Button>
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
        DevAI 🦄
      </Button>
    </>
  );
};

export default DevaBot;
