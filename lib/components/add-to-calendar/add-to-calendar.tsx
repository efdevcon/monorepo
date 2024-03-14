import React from "react";
import { generateCalendarExport } from "lib/components/add-to-calendar";
import { Modal, ModalContent } from "lib/components/modal";

type ModalProps = {
  open: boolean;
  close: () => void;
};

export const AddToCalendar = ({ open, close }: ModalProps) => {
  if (!open) return <></>;

  return (
    <Modal open={open} close={close}>
      <ModalContent
        className="border-solid border-[#8B6BBB] border-t-4"
        close={close}
      >
        <div>Hello world</div>
      </ModalContent>
    </Modal>
  );
};
