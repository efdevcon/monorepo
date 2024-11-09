import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "lib/components/link";
import { Button } from "lib/components/button";
import CloseIcon from "../../assets/icons/cross.svg";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useRecoilState, useResetRecoilState, atom } from "recoil";
import { CircleIcon } from "lib/components/circle-icon";
import { FancyLoader } from "lib/components/loader/loader";
import { Separator } from "lib/components/ui/separator";
import { useDraggableLink } from "lib/components/link/Link";
import InfoIcon from "../../assets/icons/info-fill.svg";
import SwipeToScroll from "lib/components/event-schedule/swipe-to-scroll";
import LoginLogo from "./login-logo.png";
import BellHollow from "lib/assets/icons/bell-hollow.svg";
import SquareSparkles from "lib/assets/icons/square-sparkle.svg";
import AIImage from "./ai-generate.png";
import ScrollDownIcon from "lib/assets/icons/scroll-down.svg";
import SendIcon from "lib/assets/icons/send.svg";
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
      width="42"
      height="18"
      viewBox="0 0 42 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.418 6.40037V0.693848H17.8039V2.87048H20.1354L21.7088 0.693848H23.3311L21.3501 3.41667L23.3392 6.40037H21.6925L20.1109 4.05254L17.8039 4.04439V6.40037H16.418Z"
        fill="black"
      />
      <path
        d="M12.122 2.98438C14.0704 3.16372 15.0731 3.33492 15.0731 4.82677C15.0731 5.8784 14.3801 6.54688 12.3176 6.54688H11.5024C9.27684 6.54688 8.64096 5.911 8.63281 4.45992H10.0921C10.0676 5.10394 10.3285 5.42187 11.8693 5.42187H12.0323C13.3611 5.42187 13.6464 5.29959 13.6464 4.82677C13.6464 4.28057 12.8638 4.2072 11.5187 4.07677C9.99424 3.93003 8.76325 3.59579 8.76325 2.27514C8.76325 1.13383 9.42358 0.546875 11.5187 0.546875H12.3339C14.1274 0.546875 14.959 1.31318 14.9671 2.62568H13.5079V2.64198C13.5079 1.9572 13.1329 1.67187 11.9671 1.67187H11.804C10.4263 1.67187 10.1817 1.80231 10.1817 2.23437C10.1817 2.73166 11.0214 2.8784 12.122 2.98438ZM14.9671 2.62568V2.64198V2.62568ZM10.0921 4.43546V4.45992V4.43546ZM8.63281 4.45992V4.44361V4.45992Z"
        fill="black"
      />
      <path
        d="M6.10144 5.44656H2.52261L2.03347 6.40037H0.574219L3.51718 0.693848H5.0498L8.08244 6.40037H6.60688L6.10144 5.44656ZM5.50633 4.31341L4.2998 2.06341L3.10957 4.31341H5.50633Z"
        fill="black"
      />
      <path
        d="M39.7627 17.4531V8.54688H41.9256V17.4531H39.7627Z"
        fill="#7D52F4"
      />
      <path
        d="M35.2416 15.9645H29.6562L28.8928 17.4531H26.6154L31.2084 8.54688H33.6004L38.3334 17.4531H36.0305L35.2416 15.9645ZM34.3129 14.1959L32.4298 10.6844L30.5723 14.1959H34.3129Z"
        fill="black"
      />
      <path
        d="M20.8009 17.4531L17.5565 8.54688H19.8466L21.9587 15.0611L24.0453 8.54688H26.3354L23.091 17.4531H20.8009Z"
        fill="black"
      />
      <path
        d="M12.3755 10.3281V11.9821H15.8999V13.7634H12.3755V15.6718H16.4088V17.4531H10.3398V8.54688H16.4088V10.3281H12.3755Z"
        fill="black"
      />
      <path
        d="M0.574219 8.54688H3.23335C6.37597 8.54688 8.30988 10.2391 8.30988 13C8.30988 15.7609 6.37597 17.4531 3.23335 17.4531H0.574219V8.54688ZM2.60992 15.6718H3.23335C5.06549 15.6718 6.18512 14.654 6.18512 13C6.18512 11.346 5.06549 10.3281 3.23335 10.3281H2.60992V15.6718Z"
        fill="black"
      />
    </svg>
  );
};

const DevaBot = ({
  recommendationMode,
  sessions,
  onToggle,
  defaultPrompt,
  setDefaultPrompt,
  toggled,
  notifications,
  notificationsCount,
  renderNotifications,
  markNotificationsAsRead,
  SessionComponent,
}: {
  recommendationMode?: boolean;
  sessions?: any;
  toggled: boolean;
  onToggle: (visible: string | boolean) => void;
  notifications?: any[];
  notificationsCount?: number;
  renderNotifications?: () => React.ReactNode;
  markNotificationsAsRead?: () => void;
  defaultPrompt?: string;
  setDefaultPrompt?: (prompt: string) => void;
  SessionComponent?: React.ReactNode | React.ElementType;
}) => {
  // const [visible, onToggled] = useRecoilState(visibleState);
  const [query, setQuery] = useRecoilState(queryState);
  const [executingQuery, setExecutingQuery] =
    useRecoilState(executingQueryState);
  const [error, setError] = useRecoilState(errorState);
  const [threadID, setThreadID] = useRecoilState(threadIDState);
  const [messages, setMessages] = useRecoilState(messagesState);
  const textareaRef = React.useRef<HTMLInputElement>(null);
  const draggable = useDraggableLink();
  // const messagesScrollRef = React.useRef<HTMLDivElement>(null);

  const resetMessages = useResetRecoilState(messagesState);
  const resetThreadID = useResetRecoilState(threadIDState);

  const [activeTab, setActiveTab] = React.useState(0);
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [streamingMessage, setStreamingMessage] = React.useState("");
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  React.useEffect(() => {
    if (defaultPrompt) {
      if (defaultPrompt === "tab:notifications") {
        setActiveTab(1);
        setDefaultPrompt && setDefaultPrompt("");
      } else {
        setActiveTab(0);
        setQuery(defaultPrompt);
      }
    }
  }, [defaultPrompt]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const devaBotPrompt = urlParams.get("devabot");

    if (devaBotPrompt) {
      onToggle(devaBotPrompt);
    }
  }, []);

  // Add this useEffect hook to check screen size
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 500);
    };

    // Check on mount
    checkScreenSize();

    // Add event listener for resize
    window.addEventListener("resize", checkScreenSize);

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  React.useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  React.useEffect(() => {
    setError("");
  }, [query]);

  // React.useEffect(() => {
  //   if (typeof toggled === "boolean") {
  //     onToggle(toggled);
  //   }
  // }, [toggled]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const isAtBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 50;
      setIsAtBottom(isAtBottom);
    }
  };

  const scrollToBottom = (force?: boolean) => {
    if (!messagesEndRef.current) return;

    if (isAtBottom || force) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (executingQuery && isAtBottom) {
      intervalId = setInterval(scrollToBottom, 300);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [executingQuery, isAtBottom]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkIfAtBottom);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", checkIfAtBottom);
      }
    };
  }, []);

  const reset = () => {
    setExecutingQuery(false);
    setStreamingMessage("");
    setError("");
    resetThreadID();
    resetMessages();
  };

  const onSend = async (overrideQuery?: string) => {
    const queryToSend = overrideQuery || query;

    if (executingQuery || queryToSend.length === 0) return;

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
        body: JSON.stringify({ message: queryToSend, threadID }),
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

  const scrollPositionRef = React.useRef(0);
  const scrollLock = React.useRef(false);

  const [isIOS, setIsIOS] = React.useState(false);

  React.useEffect(() => {
    // Check if the device is iOS
    const checkIsIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    setIsIOS(checkIsIOS());
  }, []);

  React.useEffect(() => {
    if (toggled) {
      scrollPositionRef.current = window.scrollY;
      scrollLock.current = true;

      if (isIOS) {
        // IOS needs this demonic hack to work... (this effectively hides a visual bug while also disabling scroll on background)
        setTimeout(() => {
          if (!scrollLock.current) return;
          document.documentElement.style.overflow = "hidden";
          document.documentElement.style.height = "100vh";
          document.body.style.overflow = "hidden";
          document.body.style.height = "100vh";
        }, 250);
      } else {
        // For non-iOS devices, use a simpler approach
        document.body.style.overflow = "hidden";
      }
    } else {
      scrollLock.current = false;
      if (isIOS) {
        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
        document.body.style.overflow = "";
        document.body.style.height = "";
      } else {
        document.body.style.overflow = "";
      }
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, [toggled, isIOS]);

  // useEffect(() => {
  //   if (toggled) {
  //     // Store the current scroll position
  //     scrollPositionRef.current = window.pageYOffset;

  //     // Apply styles to prevent scrolling
  //     document.body.style.position = "fixed";
  //     document.body.style.top = `-${scrollPositionRef.current}px`;
  //     document.body.style.width = "100%";

  //     return () => {
  //       // Remove the styles and restore scroll position
  //       document.body.style.position = "";
  //       document.body.style.top = "";
  //       document.body.style.width = "";
  //       window.scrollTo(0, scrollPositionRef.current);
  //     };
  //   }
  // }, [toggled]);

  return (
    <>
      <AnimatePresence>
        {toggled && (
          <motion.div
            className="fixed bottom-0 right-0 left-0 top-0 z-[1000000000] overflow-hidden"
            onClick={() => onToggle(false)}
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
              className="absolute right-0 h-full z-10 h-[100vh] w-[500px] md:w-[400px] max-w-full lg:max-w-auto bg-[#FDFDFF] shadow-xl flex flex-col gap-0 items-start overflow-hidden rounded-tl-[var(--safe-area-corner-radius)] rounded-tr-[var(--safe-area-corner-radius)]"
              style={{
                paddingTop: "calc(0px + max(16px, env(safe-area-inset-top)))",
                paddingBottom:
                  "calc(0px + max(16px, env(safe-area-inset-bottom)))",
              }}
              initial={{
                [isSmallScreen ? "y" : "x"]: "100%",
              }}
              animate={{
                [isSmallScreen ? "y" : "x"]: "0%",
              }}
              exit={{
                [isSmallScreen ? "y" : "x"]: "100%",
              }}
              transition={{
                duration: 0.35,
              }}
            >
              {error && (
                <div className="text-red-500 absolute inset-0 z-[100] bg-opacity-90 bg-white flex flex-col items-center justify-center">
                  <p className="text-lg font-bold px-8 text-center">
                    Deva crashed for an unknown reason! Please try again.
                  </p>
                  <Button
                    onClick={reset}
                    color="black-1"
                    className="mt-4 plain"
                    fill
                  >
                    Start Over
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2 shrink-0 w-full mb-2 px-4">
                <div className="flex justify-between w-full">
                  <div className="shrink-0 bold">
                    <Image
                      src={LoginLogo}
                      alt="Devcon Passport Graphic"
                      className="object-cover w-[180px]"
                    />
                    {/* <Trigger className="w-[70px]" /> */}
                  </div>

                  <div
                    className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[#222530] select-none cursor-pointer hover:scale-110 transition-all duration-300"
                    onClick={() => onToggle(false)}
                  >
                    <CloseIcon style={{ fill: "#fff", fontSize: "12px" }} />
                  </div>
                </div>
              </div>

              {notifications && (
                <div className="flex justify-evenly gap-2 bg-[#EFEBFF] rounded-lg p-1 mt-4 max-w-[350px] shrink-0 mb-2 w-full self-center px-4">
                  <div
                    className={cn(
                      "flex justify-center items-center self-center grow rounded-md gap-2 text-[#A897FF] hover:bg-white hover:shadow-md cursor-pointer p-1 transition-all duration-300 select-none",
                      {
                        "bg-white shadow-md text-[#7D52F4]": activeTab === 0,
                      }
                    )}
                    onClick={() => setActiveTab(0)}
                  >
                    <SquareSparkles
                      className="transition-all duration-300"
                      style={
                        activeTab === 0
                          ? { fill: "#7D52F4", fontSize: "18px" }
                          : { fill: "#A897FF", fontSize: "18px" }
                      }
                    />
                    <Trigger className="w-[50px]" />
                  </div>
                  <div
                    className={cn(
                      "flex justify-center items-center w-[175px] rounded-md gap-2 text-[#A897FF] hover:bg-white hover:shadow-md cursor-pointer p-1 transition-all duration-300 select-none",
                      {
                        "bg-white shadow-md text-[#7D52F4]": activeTab === 1,
                      }
                    )}
                    onClick={() => {
                      setActiveTab(1);
                      setTimeout(() => {
                        markNotificationsAsRead && markNotificationsAsRead();
                      }, 500);
                    }}
                  >
                    <BellHollow
                      className="transition-all duration-300"
                      style={
                        activeTab === 1
                          ? { fill: "#7D52F4" }
                          : { fill: "#A897FF" }
                      }
                    />
                    <div className="text-sm">Notifications</div>

                    {/* @ts-ignore */}
                    {notificationsCount > 0 && (
                      <div className="bg-[#7D52F4] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs lg:text-[12px] scale-90">
                        {notificationsCount}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 1 && notifications && renderNotifications && (
                <div className="w-full px-4">{renderNotifications()}</div>
              )}

              {activeTab === 0 && (
                <>
                  <div className="relative flex flex-col grow w-full gap-4 no-scrollbar px-4">
                    <div
                      className="relative overflow-auto flex flex-col grow w-full gap-2 no-scrollbar pb-10 mt-4 text-base lg:text-sm"
                      ref={messagesContainerRef}
                      onScroll={checkIfAtBottom}
                    >
                      {messages &&
                        messages.length > 0 &&
                        messages.map((message: any, index: any) => {
                          const isAssistantReply = message.role === "assistant";

                          return (
                            <div key={index} className="shrink-0 flex flex-col">
                              <div
                                className={cn("markdown p-3 py-2 w-auto", {
                                  "mr-2 bg-[#F0F2FF] rounded-tl-xl rounded-tr-xl rounded-br-xl text-left self-start":
                                    isAssistantReply,
                                  "ml-2 bg-[#7D52F4] text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl self-end":
                                    !isAssistantReply,
                                })}
                              >
                                <Markdown className={cn("markdown")}>
                                  {
                                    message.text.split(
                                      "System: The current date and time is:"
                                    )[0]
                                  }
                                </Markdown>

                                {message.files.length > 0 && (
                                  <div className="flex flex-col text-sm">
                                    {(() => {
                                      const referencesTracker = {} as any;
                                      const otherReferences = [] as any;
                                      const sessionReferences = [] as any;

                                      message.files.forEach(
                                        (
                                          { file, fileUrl }: any,
                                          index: number
                                        ) => {
                                          // Skip AI context in production
                                          if (
                                            process.env.NODE_ENV !==
                                              "development" &&
                                            file.filename === "ai_context.txt"
                                          ) {
                                            return;
                                          }

                                          const sessionId =
                                            file?.filename?.startsWith(
                                              "session_"
                                            ) &&
                                            file.filename.endsWith(".json") &&
                                            file.filename
                                              .split("session_")[1]
                                              .split(".json")[0];

                                          if (sessionId) {
                                            const session = sessions.find(
                                              (s: any) => s.id === sessionId
                                            );
                                            if (
                                              session &&
                                              !referencesTracker[sessionId]
                                            ) {
                                              referencesTracker[sessionId] =
                                                true;
                                              sessionReferences.push(
                                                SessionComponent ? (
                                                  // @ts-ignore
                                                  <SessionComponent
                                                    session={session}
                                                    key={index}
                                                  />
                                                ) : (
                                                  <Link
                                                    href={`/sessions/${session.sourceId}`}
                                                    className="p-2 bg-[#303030] rounded-md !text-white text-xs flex flex-col gap-1 hover:bg-[#232323] transition-all duration-300 w-full"
                                                    key={index}
                                                  >
                                                    <p className="">
                                                      {session.title}
                                                    </p>
                                                    <p>{session.type}</p>
                                                    <p className="opacity-70">
                                                      {session.speakers
                                                        .map(
                                                          (speaker: any) =>
                                                            speaker.name
                                                        )
                                                        .join(", ")}
                                                    </p>
                                                  </Link>
                                                )
                                              );
                                            }
                                          } else if (fileUrl) {
                                            if (
                                              !referencesTracker[file.fileUrl]
                                            ) {
                                              referencesTracker[file.fileUrl] =
                                                true;
                                              otherReferences.push(
                                                <Link
                                                  href={`https://devcon.org${fileUrl}`}
                                                  key={index}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  https://devcon.org{fileUrl}
                                                </Link>
                                              );
                                            }
                                          } else {
                                            otherReferences.push(
                                              <div key={index}>
                                                {file.filename}
                                              </div>
                                            );
                                          }
                                        }
                                      );

                                      return (
                                        <>
                                          {otherReferences.length > 0 && (
                                            <div className="flex flex-col gap-1">
                                              <p className="mt-1 font-bold">
                                                References
                                              </p>
                                              <div className="flex gap-2 flex-wrap">
                                                {otherReferences}
                                              </div>
                                            </div>
                                          )}
                                          {sessionReferences.length > 0 && (
                                            <div className="flex flex-col gap-2 mt-2">
                                              <p className="mt-1 font-bold">
                                                Related Sessions
                                              </p>
                                              <div className="flex gap-2 flex-wrap">
                                                {sessionReferences}
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
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

                      <div ref={messagesEndRef} />

                      <AnimatePresence>
                        {!executingQuery &&
                          !streamingMessage &&
                          messages &&
                          messages.length === 0 && (
                            <motion.div
                              className="mt-2 lg:mt-0"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.5 }}
                            >
                              <div className="flex flex-row gap-3 p-4 bg-[#F0F2FF] rounded-xl select-none">
                                <InfoIcon
                                  className="shrink-0 mt-[3px] icon"
                                  style={
                                    {
                                      "--icon-color": "#7D52F4",
                                      "--color-icon": "#7D52F4",
                                      fontSize: "18px",
                                      fill: "#7D52F4",
                                    } as any
                                  }
                                />

                                <div className="flex flex-col gap-1">
                                  <p className="font-bold text-base">
                                    Experimental Feature
                                  </p>
                                  <p className="text-sm text-[#6B6186]">
                                    This is an MVP and Deva may sometimes
                                    provide answers that are not true - we take
                                    no responsibility for, or endorse, anything
                                    Deva says beyond Event information. All chat
                                    data will be deleted after Devcon.
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>

                    {!isAtBottom && (
                      <AnimatePresence>
                        <motion.div
                          className="absolute right-0 left-0 bottom-0.5 translate-y-full flex justify-center items-center select-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CircleIcon
                            className="bg-[#F0F2FF] w-[30px] h-[30px]"
                            onClick={() => scrollToBottom(true)}
                          >
                            <ScrollDownIcon style={{ fontSize: "18px" }} />
                          </CircleIcon>
                        </motion.div>
                      </AnimatePresence>
                    )}

                    <div className="absolute right-0 bottom-2 pr-4">
                      <FancyLoader loading={executingQuery} size={60} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {!executingQuery &&
                      !streamingMessage &&
                      messages &&
                      messages.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg w-full flex items-center justify-center px-4 text-center flex-col gap-4"
                        >
                          <Image
                            src={AIImage}
                            alt="Deva AI"
                            className="w-[150px] select-none"
                            quality={100}
                          />

                          <p className="font-semibold w-[250px]">
                            Ask me anything related to Devcon SEA.
                          </p>
                        </motion.div>
                      )}
                  </AnimatePresence>

                  {messages.length > 0 && !executingQuery && (
                    <div className="flex justify-start ml-2 w-full mb-2 shrink-0">
                      <div
                        onClick={reset}
                        className="shrink-0 select-none cursor-pointer mr-2 rounded-full bg-white border border-solid border-[#E1E4EA] px-3 py-1 text-xs flex items-center justify-center text-[#717784] hover:text-black transition-all duration-300"
                      >
                        <p>Start New Conversation</p>
                      </div>
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

                  <div
                    className={cn("", {
                      hidden: executingQuery || messages.length > 0,
                    })}
                  >
                    <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
                      <div className="flex mb-3">
                        <div
                          className={`flex flex-wrap gap-2 py-2 shrink-0 ${
                            messages.length > 0 ? "hidden" : ""
                          }`}
                        >
                          {["What should I do at Devcon?", "Why SEA?"].map(
                            (suggestion, index, array) => (
                              <Button
                                key={index}
                                {...draggable}
                                className={`!text-black !py-1.5 !px-3 rounded !text-base lg:!text-sm plain border-none shadow bg-gray-100 ${
                                  index === array.length - 1 ? "" : ""
                                } ${index === 0 ? "ml-4" : ""}`}
                                fat
                                onClick={() => {
                                  setQuery(suggestion);
                                  textareaRef.current?.focus();
                                }}
                              >
                                {suggestion}
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </SwipeToScroll>
                  </div>

                  <Separator className="mb-3 w-full" />

                  <div
                    className={cn(
                      "shrink-0 flex items-center justify-center gap-1 mb-0 mt-1.5 w-full relative px-4 pr-2",
                      { "mt-0": executingQuery || messages.length > 0 }
                    )}
                  >
                    {/* <div className="icon mr-1">
                      <AppIconOne />
                    </div> */}
                    <div className={cn("grow relative")}>
                      <input
                        className={cn(
                          // text-16 = avoid zoom on iphone jesus christ
                          "w-full py-3 h-[35px] px-4 pr-10 bg-[#F0F2FF] text-base lg:text-sm rounded-full placeholder-[#747474] focus:outline-none",
                          {
                            "opacity-50": executingQuery,
                          }
                        )}
                        ref={textareaRef}
                        value={query}
                        onChange={(e) => {
                          if (!executingQuery) {
                            setQuery(e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !executingQuery
                          ) {
                            e.preventDefault();
                            onSend();
                          }
                        }}
                        type="text"
                        placeholder="Ask me anything..."
                      />
                      <div
                        className={cn(
                          "absolute right-4 top-1/2 transform -translate-y-1/2 focus:outline-none hover:scale-110 transition-all pb-[2px] cursor-pointer",
                          {
                            "opacity-50": executingQuery,
                            "opacity-0": query.length === 0,
                          }
                        )}
                        onClick={() => {
                          setQuery("");
                          textareaRef.current?.focus();
                        }}
                      >
                        <CloseIcon
                          style={{ fontSize: "10px", fill: "#646E83" }}
                        />
                      </div>
                    </div>

                    <div>
                      <CircleIcon
                        className={cn(
                          "mx-1 h-[34px] w-[34px] text-2xl bg-[#F0F2FF]",
                          {
                            // "opacity-50": executingQuery,
                            "!bg-[#7D52F4]": query.length > 0,
                          }
                        )}
                        onClick={() => {
                          onSend();
                        }}
                        disabled={executingQuery || query.length === 0}
                      >
                        {executingQuery}
                        <SendIcon
                          className="text-lg icon transition-all duration-500"
                          style={{
                            fontSize: "12px",
                            fill: query.length > 0 ? "white" : "#646E83",
                          }}
                        />
                      </CircleIcon>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* {!onToggle && (
        <div
          onClick={() => onToggle(true)}
          className="section cursor-pointer"
        >
          <Trigger />
        </div>
      )} */}

      {/* <Button
        className="plain"
        className="bold"
        color="blue-1"
        fill
        onClick={() => onToggled(!visible)}
      >
        <span className="md:hidden block">Questions?</span>
        <span className="hidden md:block">Questions? Ask here 🦄</span>
      </Button> */}
    </>
  );
};

export default DevaBot;
