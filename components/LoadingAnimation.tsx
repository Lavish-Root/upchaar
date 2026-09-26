import React from 'react';
import { useLottie } from 'lottie-react';
import praansevaLoadingAnimation from './loadingAnimationData';

export interface LoadingAnimationProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  submessage?: string;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-12 h-12',
  md: 'w-24 h-24',
  lg: 'w-36 h-36',
  xl: 'w-52 h-52',
};

const LottieViewer: React.FC = () => {
  const options = {
    animationData: praansevaLoadingAnimation,
    loop: true,
    autoplay: true,
  };
  const { View } = useLottie(options, { width: '100%', height: '100%' });
  return <>{View}</>;
};

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  className,
  size = 'md',
  message,
  submessage,
}) => {
  const containerClass = className || sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className={`${containerClass} flex items-center justify-center`}>
        <LottieViewer />
      </div>
      {message && (
        <p className="mt-3 text-sm font-semibold text-slate-700 tracking-wider uppercase">
          {message}
        </p>
      )}
      {submessage && (
        <p className="mt-1 text-xs text-slate-500 font-medium">
          {submessage}
        </p>
      )}
    </div>
  );
};

export default LoadingAnimation;
