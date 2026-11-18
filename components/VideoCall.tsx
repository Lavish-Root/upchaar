import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import Pusher from 'pusher-js';

// Pusher Setup
const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
  cluster: 'ap2',
});

interface VideoCallProps {
  roomId: string;
  userId: string;
}

export const VideoCall: React.FC<VideoCallProps> = ({ roomId, userId }) => {
  const myVideo = useRef<HTMLVideoElement>(null);
  const peerVideo = useRef<HTMLVideoElement>(null);
  const [peer, setPeer] = useState<Peer | null>(null);

  useEffect(() => {
    const newPeer = new Peer(userId);
    setPeer(newPeer);

    const channel = pusher.subscribe(`presence-${roomId}`);

    channel.bind('signal', (data: any) => {
      if (data.to === userId) {
        if (data.offer) newPeer.call(data.from, data.offer);
        if (data.answer) /* handle answer */;
      }
    });

    return () => {
      newPeer.destroy();
      pusher.unsubscribe(`presence-${roomId}`);
    };
  }, [roomId, userId]);

  return (
    <div>
      <video ref={myVideo} autoPlay muted />
      <video ref={peerVideo} autoPlay />
    </div>
  );
};
