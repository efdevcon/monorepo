import Image from "next/image";
import { TinaMarkdown, TinaMarkdownContent } from "tinacms/dist/rich-text";
import css from "./rich-text.module.scss";

const TwoColumns = (data: any) => {
  return (
    <div className="grid grid-cols-2 gap-8 w-full">
      <div className="grow">
        <TinaMarkdown content={data?.left} />
      </div>
      <div className="grow">
        <TinaMarkdown content={data?.right} />
      </div>
    </div>
  );
};

export default ({ content }: { content: TinaMarkdownContent }) => {
  return (
    <div className={css["rich-text"]}>
      <TinaMarkdown
        components={{
          TwoColumns,
          img: (img: any) => {
            return (
              <Image
                src={img?.url || ""}
                alt={img?.alt || ""}
                className="w-full"
              />
            );
          },
          // Different font sizes don't really make semantic sense as headers - we normalize all markdown headers to paragraphs, and will add header functionality separately
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
              <p data-cms-header="h4" className="text-lg">
                {children}
              </p>
            );
          },
          h5: ({ children }: any) => {
            return (
              <p data-cms-header="h5" className="text-base">
                {children}
              </p>
            );
          },
          h6: ({ children }: any) => {
            return (
              <p data-cms-header="h6" className="text-base">
                {children}
              </p>
            );
          },
        }}
        content={content}
      ></TinaMarkdown>
    </div>
  );
};
