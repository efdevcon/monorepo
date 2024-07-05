import Image from "next/image";
import { TinaMarkdown, TinaMarkdownContent } from "tinacms/dist/rich-text";
import { Button } from "lib/components/button";
import css from "./rich-text.module.scss";
import Link from "next/link";

const EnhancedTinaMarkdown = (props: any) => {
  return (
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
          return <p /*data-cms-header="h4"*/ className="text-lg">{children}</p>;
        },
        h5: ({ children }: any) => {
          return (
            <p /*data-cms-header="h5"*/ className="text-base">{children}</p>
          );
        },
        h6: ({ children }: any) => {
          return <p /*data-cms-header="h6"*/ className="text-sm">{children}</p>;
        },
      }}
      {...props}
    ></TinaMarkdown>
  );
};

const TwoColumns = (data: any) => {
  return (
    <div
      data-type="two-columns"
      className={`flex flex-col lg:flex-row gap-8 w-full`}
    >
      <div
        data-type="two-columns-left"
        className={`${css["rich-text"]} flex-1`}
      >
        <EnhancedTinaMarkdown content={data?.left} />
      </div>
      <div
        data-type="two-columns-right"
        className={`${css["rich-text"]} flex-1`}
      >
        <EnhancedTinaMarkdown content={data?.right} />
      </div>
    </div>
  );
};

const Buttons = (data: any) => {
  if (!data.Button) return <></>;

  return (
    <div className="flex gap-4" data-cms-element="button">
      {data.Button.map(({ text, url, color, disabled, fill }: any) => {
        if (!url || !text) return null;

        return (
          <Link href={url} key={text}>
            <Button
              fat
              color={color || "purple-1"}
              fill={typeof fill === "undefined" ? true : fill}
              disabled={disabled}
            >
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
      <EnhancedTinaMarkdown content={content}></EnhancedTinaMarkdown>
    </div>
  );
};
