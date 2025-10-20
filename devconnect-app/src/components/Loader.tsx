import css from './Loader.module.scss';
import cn from 'classnames';

interface LoaderProps {
  wrapperClassName?: string;
  className?: string;
  children?: React.ReactNode;
}

const Loader = (props: LoaderProps) => {
  const wrapperClassName = cn(
    'flex flex-col items-center',
    props.wrapperClassName
  );
  const spinner = <div className={cn(css['loader'], props.className)}></div>;

  if (props.children) {
    return (
      <div className={wrapperClassName}>
        <div>{spinner}</div>
        <div className="text-xs mt-1">{props.children}</div>
      </div>
    );
  }

  return spinner;
};

export default Loader;
