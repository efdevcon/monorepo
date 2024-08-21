import React from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import DevaHead from "./deva.png";
import { Button } from "lib/components/button";
import CloseIcon from "../../assets/icons/cross.svg";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
// https://github.com/ztjhz/BetterChatGPT/blob/main/src/components/Chat/ChatContent/Message/View/ContentView.tsx#L132

const DevaBot = () => {
  const [visible, setVisible] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [executingQuery, setExecutingQuery] = React.useState(false);
  const [error, setError] = React.useState("");
  const [threadID, setThreadID] = React.useState("");
  const [messages, setMessages] = React.useState<any>([]);

  React.useEffect(() => {
    setError("");
  }, [query]);

  const reset = () => {
    setThreadID("");
    setMessages([]);
  };

  const onSend = async () => {
    if (executingQuery) return;

    setExecutingQuery(true);

    try {
      let url = "/api/ai";

      // if (threadID) {
      //   url += `?threadID=${threadID}`
      // }

      // const response = await (
      //   await fetch('http://localhost:4000/ai/devcon-website/ask', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({ query, threadID, messages }),
      //   })
      // ).json()

      // console.log(response, 'response')

      // const nextMessages = response.map((message: any) => {
      //   return {
      //     id: message,
      //     role: 'assistant',
      //     text: message.generated_text.split('[/INST]').pop().trim(),
      //   }
      // })

      // console.log(nextMessages, 'hello')

      // setMessages([
      //   ...messages,
      //   {
      //     // id: query,
      //     role: 'user',
      //     content: query,
      //   },
      //   {
      //     // id: Math.random(),
      //     role: 'assistant',
      //     content: response, // .generated_text.split('[/INST]').pop().trim(),
      //   },
      //   // ...nextMessages,
      // ])

      // console.log(resultTest, 'hello from backend')

      // return

      const result = await (
        await fetch(url, {
          method: "POST",
          body: JSON.stringify({ message: query, threadID }),
        })
      ).json();

      // console.log(result, 'hello')

      // // add error case for run status not equal to whatever success string is from open ai

      setThreadID(result.threadID);
      setMessages(result.messages);
    } catch (e) {
      console.error(e, "error");

      // @ts-ignore
      setError(e.message);
    }

    setExecutingQuery(false);
  };

  console.log(messages, "messages");

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
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
            <div className="flex flex-col gap-2">
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
              {messages.length > 0 &&
                messages.map((message: any, index: any) => {
                  return (
                    <div key={index} className="shrink-0 flex flex-col">
                      <span className="text-sm opacity-50">
                        {message.role === "assistant"
                          ? "DevAI responded"
                          : "You asked"}
                      </span>
                      <Markdown className="markdown">{message.text}</Markdown>

                      {message.files.length > 0 && (
                        <div className="flex flex-col text-sm opacity-50 ">
                          <p className="mt-1">References</p>
                          <div className="flex gap-2">
                            {(() => {
                              // Sometimes multiple references go to the same page - this prevents rendering the same one more than once
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

              {executingQuery && <div>Executing query...</div>}
              {error && <div className="text-red-500">{error}</div>}

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

      {/* <div
        className="fixed bottom-4 right-4 z-10 rounded-full bg-slate-700 text-white p-3 w-24 h-24 flex flex-col items-center justify-center &:hover:bg-slate-800"
        onClick={() => setVisible(!visible)}
      >
        <Image src={DevaHead} alt="Deva Bot" className="object-contain" />
        <p className="mt-1 mb-1 text-xs">Ask DevAI</p>
      </div> */}
    </>
  );
};

export default DevaBot;
