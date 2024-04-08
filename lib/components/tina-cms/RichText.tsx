import Image from "next/image";
import { TinaMarkdown, TinaMarkdownContent } from "tinacms/dist/rich-text";
import { Button } from "lib/components/button";
import css from "./rich-text.module.scss";
import Link from "next/link";

const TwoColumns = (data: any) => {
  return (
    <div className="grid md:grid-cols-2 gap-8 w-full grid-cols-1">
      <div className="grow">
        <TinaMarkdown content={data?.left} />
      </div>
      <div className="grow">
        <TinaMarkdown content={data?.right} />
      </div>
    </div>
  );
};

const Buttons = (data: any) => {
  if (!data.Button) return null;

  return (
    <div className="flex gap-4">
      {data.Button.map(({ text, url }: any) => {
        if (!url || !text) return null;

        return (
          <Link href={url} key={text}>
            <Button fat color="purple-1" fill>
              {text}
            </Button>
          </Link>
        );
      })}
    </div>
  );
};

export default ({ content }: { content: TinaMarkdownContent }) => {
  return (
    <div className={css["rich-text"]}>
      <TinaMarkdown
        components={{
          TwoColumns,
          Buttons,
          img: (img: any) => {
            return (
              <div className="w-full relative">
                <Image
                  src={img?.url || ""}
                  alt={img?.alt || ""}
                  layout="fill"
                  className="!w-full !relative !h-auto"
                />
              </div>
            );
          },
          // p: ({ children }: any) => {
          //   return <div>{children}</div>;
          // },
          // Different font sizes don't really make semantic sense as headers - we normalize all markdown headers to paragraphs (so it's really just a size picker)
          h1: ({ children }: any) => {
            return (
              <p data-cms-header="h1" className="text-3xl">
                {children}
              </p>
            );
          },
          h2: ({ children }: any) => {
            return (
              <p data-cms-header="h2" className="text-2xl">
                {children}
              </p>
            );
          },
          h3: ({ children }: any) => {
            return (
              <p data-cms-header="h3" className="text-xl">
                {children}
              </p>
            );
          },
          h4: ({ children }: any) => {
            return (
              <p /*data-cms-header="h4"*/ className="text-lg">{children}</p>
            );
          },
          h5: ({ children }: any) => {
            return (
              <p /*data-cms-header="h5"*/ className="text-base">{children}</p>
            );
          },
          h6: ({ children }: any) => {
            return (
              <p /*data-cms-header="h6"*/ className="text-sm">{children}</p>
            );
          },
        }}
        content={content}
      ></TinaMarkdown>
    </div>
  );
};
