import React from "react";
import { createPortal } from "react-dom";
import css from "./modal.module.scss";
import IconClose from "assets/icons/cross.svg";
import { motion } from "framer-motion";

type ModalContentProps = {
  className?: string;
  close?: () => void;
  children: any;
  noBodyScroll?: boolean;
  [key: string]: any;
};

type ModalProps = {
  open: boolean;
  className?: string;
  close: () => void;
  children: any;
  [key: string]: any;
};

export const ModalContent = (props: ModalContentProps) => {
  // Prevent page scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  let className = "max-h-[90vh] max-w-[90vw] relative bg-slate-100 cursor-auto";

  if (props.className) className += ` ${props.className}`;

  return (
    <motion.div
      className={className}
      onClick={(e) => {
        e.stopPropagation();
      }}
      initial={{ opacity: 0.8, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {props.close && (
        <div
          className="absolute right-0 top-0 flex p-3 cursor-pointer z-10"
          onClick={props.close}
        >
          <IconClose className={`text-xs icon`} />
        </div>
      )}

      {props.children}
    </motion.div>
  );
};

export const Modal = (props: ModalProps): any => {
  if (!props.open) return <></>;

  let className = css["modal"];

  if (props.className) className += ` ${props.className}`;

  return createPortal(
    <motion.div
      className={className}
      data-type="modal-portal"
      onClick={(e) => {
        e.stopPropagation();
        props.close();
      }}
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
    >
      {props.children}
    </motion.div>,
    document.body
  );
};
