import React from "react";
import { Link } from "@/components/common/link";
import ArrowCollapse from "@/assets/icons/arrow_collapse.svg";
import ArrowDropdown from "@/assets/icons/arrow_drop_down.svg";
import OnDemandVideoIcon from "@/assets/icons/on_demand_video.svg";
import { TRACKS } from "@/utils/config";
import css from "./navigation.module.scss";

interface NavigationProps {
  setFoldoutOpen?: (open: boolean) => void;
  mobile?: boolean;
}

export const NavigationItems = [
  { title: "Watch", url: "/watch", type: "page" },
  {
    title: "Event",
    url: "",
    type: "links",
    // logo: "/images/menu/events.svg",
    logo: "/images/menu/events.svg",
    links: [
      ...[7, 6, 5, 4, 3, 2, 1, 0].map((event) => ({
        title: `Devcon ${event}`,
        url: `/watch?event=devcon-${event}`,
        type: "page",
      })),
    ],
  },
  {
    title: "Categories",
    url: "",
    type: "links",
    // logo: "/images/menu/tags.svg",
    logo: "/images/menu/tags.svg",
    links: TRACKS.map((track) => ({
      title: track,
      url: `/watch?tags=${encodeURIComponent(track)}`,
      type: "page",
    })),
  },
  { title: "Playlists", url: "/playlists", type: "page" },
];

const Mobile = (props: any) => {
  const [openItem, setOpenItem] = React.useState<string | undefined>();

  const closeFoldout = () => {
    props.setFoldoutOpen(false);
  };

  return (
    <div className={css["mobile-navigation"]}>
      <ul className={css["accordion"]}>
        {NavigationItems.map((i: any, index: number) => {
          const children = i.links;
          const hasChildren = children && children.length > 0;
          const open = openItem === i.title;

          return (
            <li
              key={i.title}
              className={open && hasChildren ? css["open"] : ""}
            >
              {i.logo && (
                <div className={css["foldout-background"]}>
                  <img
                    src={i.logo}
                    // className={css["grayscale"]}
                    style={{
                      filter: "brightness(0)",
                      width: "100%",
                      height: "100%",
                    }}
                    alt={`${i.title}: background logo`}
                    // style={{ width: "100%", height: "100%" }}
                  />
                </div>
              )}
              {hasChildren ? (
                <div
                  className={css["accordion-toggle"]}
                  onClick={() => {
                    setOpenItem(open ? undefined : i.title);
                  }}
                >
                  {i.title}
                  {hasChildren &&
                    (open ? <ArrowCollapse /> : <ArrowDropdown />)}
                </div>
              ) : (
                <div
                  className={`${css["accordion-toggle"]} ${css["no-children"]}`}
                >
                  <Link
                    className={`plain hover-underline`}
                    style={
                      i.title === "Watch"
                        ? {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                          }
                        : undefined
                    }
                    href={i.url}
                    onClick={closeFoldout}
                  >
                    {i.title}
                    {i.title === "Watch" && (
                      <OnDemandVideoIcon style={{ fontSize: "1em" }} />
                    )}
                  </Link>
                </div>
              )}

              {hasChildren && (
                <>
                  {open && (
                    <div className={css["accordion-content"]}>
                      {children?.map((child: any) => {
                        const isHeader = child.type === "header";

                        if (isHeader) {
                          return (
                            <p
                              key={`header-${child.title}`}
                              className={css["category-header"]}
                            >
                              {child.title}
                            </p>
                          );
                        }

                        return (
                          <ul
                            key={`category-${child.title}`}
                            className={css["category-items"]}
                          >
                            <li key={child.title}>
                              <a
                                className="plain hover-underline"
                                href={child.url}
                              >
                                {child.title}
                              </a>
                            </li>
                          </ul>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const Navigation = (props: NavigationProps) => {
  if (props.mobile) {
    return <Mobile {...props} />;
  }

  return (
    <>
      <ul className={css["navigation"]}>
        {NavigationItems.map((i: any, index: number) => {
          const primaryKey = `site-nav-1_${index}`;
          const hasChildren = i.links && i.links.length > 0;

          const link = (() => {
            let className = `${css["foldout-link"]} bold`;

            const isWatch = i.title === "Watch";

            // Just keeping it simple since this is possibly a one-off thing - can generalize later if needed
            if (isWatch) {
              className += ` ${css["highlight"]}`;
            } else {
              className += ` plain`;
            }

            return (
              <Link className={className} href={i.url}>
                {i.title}
                {isWatch && <OnDemandVideoIcon />}
              </Link>
            );
          })();

          return (
            <li className="plain bold" key={primaryKey}>
              {hasChildren ? (
                <>
                  {i.title}
                  <ArrowDropdown
                    style={{ width: "10px", height: "5px", margin: "8px" }}
                  />
                  <div className={css["foldout"]}>
                    {i.logo && (
                      <div className={css["foldout-background"]}>
                        <img src={i.logo} alt={`${i.title}: background logo`} />
                      </div>
                    )}
                    {i.links && i.links.length > 0 && (
                      <ul>
                        {i.links?.map((c: any, subIndex: number) => {
                          const subKey = `site-nav-2_${subIndex}`;

                          if (c.type === "header") {
                            return (
                              <li key={subKey} className={css["header"]}>
                                <span className={css["foldout-header"]}>
                                  {c.title}
                                </span>
                              </li>
                            );
                          }

                          if (c.type === "links") {
                            // nothing?
                          }

                          return (
                            <li key={subKey}>
                              <a
                                className={`${css["foldout-link"]} plain`}
                                href={c.url}
                              >
                                {c.title}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                link
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
};
