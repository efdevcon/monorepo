import React, { useState } from 'react'
import css from './share.module.scss'
import DownloadIcon from 'assets/icons/download.svg'
import { Modal } from 'components/common/modal'
import { useAccountContext } from 'context/account-context'
import { Session } from 'types/Session'
import { Button } from 'components/common/button'
import FileSaver from 'file-saver'
import JSZip from 'jszip'
import moment from 'moment'
import { GenerateIcs } from 'utils/ics'
import Papa from 'papaparse'
import { Link } from 'components/common/link'

interface Props {
  sessions: Session[]
}

export const DownloadScheduleModal = (props: Props) => {
  const accountContext = useAccountContext()
  const [infoOpen, setInfoOpen] = useState(accountContext.edit === true ? true : false)

  async function download(type: 'csv' | 'ics') {
    if (type === 'csv') {
      var csv = Papa.unparse(
        props.sessions.map(i => {
          return {
            Subject: i.title,
            'Start Date': moment.utc(i.start).format('L'), // 05/30/2020
            'Start Time': moment.utc(i.start).format('LT'), // 10:00 AM
            'End Date': moment.utc(i.end).format('L'),
            'End Time': moment.utc(i.end).format('LT'),
            'All Day Event': false,
            Description: i.description ?? '',
            Location: `${i.room?.name}${i.room?.info ? ` - ${i.room.info}` : ''}`,
          }
        })
      )
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      FileSaver.saveAs(blob, `${moment().format('YYYYMMDDTHHmmss')}_sessions.csv`)
    }

    if (type === 'ics') {
      var zip = new JSZip()
      props.sessions.forEach(i => {
        const ics = GenerateIcs(i)
        zip.file(`${i.title}.ics`, ics)
      })

      zip.generateAsync({ type: 'blob' }).then(function (blob) {
        FileSaver.saveAs(blob, `${moment().format('YYYYMMDDTHHmmss')}_sessions.zip`)
      })
    }
  }

  return (
    <>
      <Modal className={css['modal']} open={infoOpen} close={() => setInfoOpen(false)} unstyled noIcon>
        <h4 className="text-uppercase title">Download Schedule</h4>

        <div className={css['download']}>
          <p>Download your entire Devcon schedule in .csv or .ics files to import into your own calendar app.</p>

          <p>
            E.g. import your .csv into{' '}
            <Link to="https://calendar.google.com/calendar/u/0/r/settings/export">Google Calendar</Link>
          </p>

          <p>
            <Button className="red" onClick={() => download('csv')}>
              CSV
            </Button>
            &nbsp;
            <Button className="red" onClick={() => download('ics')}>
              ICS
            </Button>
          </p>

          <p>
            *Warning session changes and updates will not be reflected. We advise you export on day of or when you have
            fully compiled your schedule.
          </p>
        </div>
      </Modal>

      <DownloadIcon
        style={{ cursor: 'pointer', fontSize: '22px', marginRight: '-4px' }}
        onClick={() => setInfoOpen(true)}
      />
    </>
  )
}
