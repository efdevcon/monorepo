import React from 'react'
import { NewsItem } from 'src/types/NewsItem'
import css from './news-page.module.scss'
import ArrowLeft from 'src/assets/icons/arrow_left.svg'
import ArrowRight from 'src/assets/icons/arrow_right.svg'
import moment from 'moment'

type NewsProps = {
  data: NewsItem
}

export const NewsPage = (props: NewsProps) => {
  const data = props.data

  return (
    <div className="section">
      <div className="content">
        <div className={css['header']}>
          {data.tags && (
            <div className={css['tags']}>
              <p className="text-uppercase bold font-sm">Tags</p>
              {data.tags.map(tag => {
                return (
                  <div key={tag} className="label bold">
                    {tag}
                  </div>
                )
              })}
            </div>
          )}

          <div className={css['title-block']}>
            <div className={css['metadata']}>
              <p className="bold text-uppercase">{moment.utc(data.date).format('MMM DD, y')}</p>
              <p className="text-uppercase">{data.author}</p>
            </div>

            <h1>{data.title}</h1>
          </div>
        </div>
        <div className={css['content']}>
          <p>
            Where does it come from? Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in
            a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin
            professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur,
            from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the
            undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum"
            (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of
            ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..",
            comes from a line in section 1.10.32.
          </p>

          <br />

          <p>
            Where does it come from? Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in
            a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin
            professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur,
            from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the
            undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum"
            (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of
            ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..",
            comes from a line in section 1.10.32.
          </p>

          <br />

          <p>
            Where does it come from? Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in
            a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin
            professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur,
            from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the
            undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum"
            (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of
            ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..",
            comes from a line in section 1.10.32.
          </p>

          <br />

          <p>
            Where does it come from? Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in
            a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin
            professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur,
            from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the
            undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum"
            (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of
            ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..",
            comes from a line in section 1.10.32.
          </p>
        </div>

        <div className={css['buttons']}>
          <button className={css['prev']}>
            <ArrowLeft /> Previous
          </button>

          <button className={css['next']}>
            Next <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  )
}
