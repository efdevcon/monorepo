import React from "react";
import { TicketBgSvg } from "./TicketBgSvg";

export const colorMap = {
  blue: { primary: "#74ACDF", secondary: "#417FB8" },
  yellow: { primary: "#F6B40E", secondary: "#B2820A" },
  pink: { primary: "#FF85A6", secondary: "#BF4465" },
};

export const colorKeys = Object.keys(colorMap);

export const Ticket = ({
  name = "Anon",
  color = "blue",
}: {
  name?: string;
  color?: string;
}) => {
  if (!colorMap[color as keyof typeof colorMap]) {
    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          top: 0,
          left: 0,
        }}
      >
        Invalid color
      </div>
    );
  }

  const { primary, secondary } =
    colorMap[color as keyof typeof colorMap] || colorMap.blue;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        top: 0,
        left: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "hidden",
          // padding: "10px 0",
        }}
      >
        <TicketBgSvg primaryColor={primary} secondaryColor={secondary} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <img
            src="https://devconnect.org/devconnect-arg/devconnect-arg-logo.png"
            alt="Devconnect ARG"
            style={{
              display: "flex",
              position: "absolute",
              top: "64px",
              left: "129px",
              width: "169px",
              height: "54px",
            }}
          />
          <img
            src="https://devconnect.org/devconnect-arg/stamp.svg"
            alt="Devconnect ARG"
            style={{
              display: "flex",
              position: "absolute",
              top: "19px",
              right: "149px",
              width: "176px",
              height: "174px",
            }}
          />
          <img
            src={`https://devconnect.org/devconnect-arg/ETH-${color}.png`}
            alt="Devconnect ARG"
            style={{
              display: "flex",
              position: "absolute",
              bottom: "68px",
              right: "131px",
              width: "112px",
              height: "178px",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              textAlign: "center",
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "1200px",
              marginLeft: "-600px",
              marginTop: "-50px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: "48px",
                color: "#8855CC",
                fontWeight: 500,
              }}
            >
              {name}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: "32px",
                color: "#222",
              }}
            >
              is going to Devconnect ARG –
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: "32px",
                color: "#222",
              }}
            >
              the Ethereum World's Fair
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "32px",
              fontSize: "24px",
              position: "absolute",
              bottom: "100px",
              left: "125px",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                color: "#1e293b",
              }}
            >
              <span
                style={{
                  fontWeight: "700",
                  color: "#376894",
                }}
              >
                17 — 22 Nov
              </span>{" "}
              2025
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                color: "#475569",
              }}
            >
              Buenos Aires, Argentina
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ticket;
