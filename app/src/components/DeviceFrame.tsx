import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  loginMode?: boolean;
}

export default function DeviceFrame({ children, loginMode }: Props) {
  return (
    <div className="device-frame" data-login={loginMode ? 'true' : undefined}>
      {children}
    </div>
  );
}
