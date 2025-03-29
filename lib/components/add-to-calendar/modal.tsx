import React from "react";
import { generateCalendarExport } from "lib/components/add-to-calendar";
import { Modal, ModalContent } from "lib/components/modal";

type ModalProps = {
  open: boolean;
  close: () => void;
  children: React.ReactNode;
};

export const AddToCalendarModal = ({ open, close, children }: ModalProps) => {
  if (!open) return <></>;

  return (
    <Modal open={open} close={close}>
      <ModalContent className="rounded-lg" close={close}>
        {children}
      </ModalContent>
    </Modal>
  );
};
