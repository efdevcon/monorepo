"use client";

import React from "react";
import { useFormField } from "@/hooks/useFormField";
import { Button } from "@/components/common/button";
import { Link } from "@/components/common/link";
import css from "./newsletter.module.scss";

export interface Result {
  result: "success" | "error";
  msg: string;
}

interface Props {
  id?: string;
}

export const Newsletter = (props: Props) => {
  const emailField = useFormField();
  const [result, setResult] = React.useState<Result | undefined>(undefined);

  function onDismiss() {
    setResult(undefined);
  }

  return (
    <div>
      <p className="semi-bold mb-2">Subscribe to our newsletter</p>
      <Link href="https://paragraph.com/@efevents/subscribe" target="_blank">
        <Button className={`white ${css["button"]}`} type="submit">
          Subscribe
        </Button>
      </Link>
    </div>
  );

  // return (
  //   <form
  //     action="https://login.sendpulse.com/forms/simple/u/eyJ1c2VyX2lkIjo4MjUxNTM4LCJhZGRyZXNzX2Jvb2tfaWQiOjEwNDI3MSwibGFuZyI6ImVuIn0="
  //     method="post"
  //   >
  //     <div>
  //       <p className="semi-bold">Subscribe to our newsletter</p>
  //       <div>
  //         {result ? (
  //           <div className={css["alert-container"]}>
  //             <Alert
  //               type={result.result}
  //               message={result.msg}
  //               dismissable={true}
  //               dismissed={onDismiss}
  //             />
  //           </div>
  //         ) : (
  //           <>
  //             <p>Stay up to date on the latest devcon news and updates.</p>
  //             <div className={css["container"]}>
  //               <input
  //                 className={css["input"]}
  //                 type="email"
  //                 name="email"
  //                 id={props.id ?? "newsletter_email"}
  //                 placeholder="Enter your email"
  //                 {...emailField}
  //               />
  //               <input type="hidden" name="sender" value={SOCIAL_EMAIL} />
  //               <Button className={`white ${css["button"]}`} type="submit">
  //                 Subscribe
  //               </Button>
  //             </div>
  //           </>
  //         )}
  //       </div>
  //     </div>
  //   </form>
  // );
};
