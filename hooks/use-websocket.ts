import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  doctorId?: string;
  onAppointmentUpdate?: (data: any) => void;
  onQueueUpdate?: (data: any) => void;
  autoConnect?: boolean;
}

export function useWebSocket({
  doctorId,
  onAppointmentUpdate,
  onQueueUpdate,
  autoConnect = true
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const currentDoctorId = useRef<string | null>(null);

  // Initialize socket connection
  const connect = () => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    setIsConnecting(true);
    
    try {
      const socket = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('🔗 WebSocket connected:', socket.id);
        setIsConnected(true);
        setIsConnecting(false);
        
        // Join doctor room if doctorId is provided
        if (doctorId) {
          socket.emit('join-doctor', doctorId);
          currentDoctorId.current = doctorId;
        }
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
        setIsConnecting(false);
      });

      socket.on('connect_error', (error: any) => {
        console.error('🚫 WebSocket connection error:', error);
        setIsConnecting(false);
        setIsConnected(false);
      });

      // Listen for appointment updates
      socket.on('appointment-update', (data: any) => {
        console.log('📨 Received appointment update:', data);
        onAppointmentUpdate?.(data);
      });

      // Listen for queue updates
      socket.on('queue-update', (data: any) => {
        console.log('📨 Received queue update:', data);
        onQueueUpdate?.(data);
      });

      socketRef.current = socket;
      return socket;
    } catch (error) {
      console.error('Error creating socket:', error);
      setIsConnecting(false);
      return null;
    }
  };

  // Disconnect socket
  const disconnect = () => {
    if (socketRef.current) {
      if (currentDoctorId.current) {
        socketRef.current.emit('leave-doctor', currentDoctorId.current);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      currentDoctorId.current = null;
    }
  };

  // Join/leave doctor rooms
  const joinDoctorRoom = (newDoctorId: string) => {
    if (socketRef.current?.connected) {
      // Leave current room
      if (currentDoctorId.current && currentDoctorId.current !== newDoctorId) {
        socketRef.current.emit('leave-doctor', currentDoctorId.current);
      }
      // Join new room
      socketRef.current.emit('join-doctor', newDoctorId);
      currentDoctorId.current = newDoctorId;
    }
  };

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  // Update doctor room when doctorId changes
  useEffect(() => {
    if (doctorId && socketRef.current?.connected) {
      joinDoctorRoom(doctorId);
    }
  }, [doctorId]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    joinDoctorRoom,
    socket: socketRef.current,
  };
}