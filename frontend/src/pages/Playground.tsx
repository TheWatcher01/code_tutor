/**
 * @file Playground.tsx
 * @description Protected playground page with auth integration
 * @author TheWatcher
 * @date 2024-11-12
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Square, Send, Settings, Paperclip, Mic, Triangle, SquareTerminal } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ModeToggle } from "@/components/modeToggle";
import AddCourseDialog from "@/components/AddCourseDialog";
import { useAuth } from '@/hooks/useAuth';
import frontendLogger from '@/config/frontendLogger';

const Playground = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth check effect
  useEffect(() => {
    if (!isAuthenticated) {
      frontendLogger.warn('Unauthorized access to Playground');
      navigate('/login', { replace: true });
    } else {
      frontendLogger.info('Playground accessed by:', {
        userId: user?.id,
        username: user?.username
      });
    }
  }, [isAuthenticated, navigate, user]);

  // Media controls handlers
  const handlePlayPause = () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        frontendLogger.error('Media control error:', error);
      }
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      } catch (error) {
        frontendLogger.error('Media stop error:', error);
      }
    }
  };

  // Message handlers
  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      frontendLogger.debug('Sending message:', { length: message.length });
      // TODO: Implement message sending
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      frontendLogger.error('Message send error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      frontendLogger.error('Logout error:', error);
    }
  };

  return (
    <div className="grid h-screen w-full pl-[56px] bg-background text-foreground">
      <aside className="inset-y fixed left-0 z-20 flex h-full flex-col border-r">
        <div className="border-b p-2">
          <Button variant="outline" size="icon" aria-label="Home">
            <Triangle className="size-5 fill-foreground" />
          </Button>
        </div>
        <ModeToggle />
        <nav className="grid gap-1 p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg bg-muted"
                aria-label="Playground"
              >
                <SquareTerminal className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>Playground</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg"
                aria-label="Settings"
                onClick={handleLogout}
              >
                <Settings className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>Logout</TooltipContent>
          </Tooltip>
        </nav>
      </aside>

      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
          <h1 className="text-xl font-semibold">
            Playground {user && `- ${user.username}`}
          </h1>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto">
                <Settings className="size-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader>
                <DrawerTitle>Configuration</DrawerTitle>
                <DrawerDescription>Configure the settings for the model and messages.</DrawerDescription>
              </DrawerHeader>
              <form className="grid gap-6 p-4">
                <fieldset className="grid gap-6 border p-4">
                  <legend className="text-sm font-medium">Settings</legend>
                  <label htmlFor="model">Model</label>
                  <Select>
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="model1">Model 1</SelectItem>
                      <SelectItem value="model2">Model 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <label htmlFor="temperature">Temperature</label>
                  <input id="temperature" type="number" placeholder="0.4" />
                </fieldset>
              </form>
            </DrawerContent>
          </Drawer>
        </header>

        <main className="grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl bg-muted/50 p-4 lg:col-span-2">
            <Badge variant="outline" className="absolute right-3 top-3">
              Output
            </Badge>
            <div className="flex-1 overflow-y-auto">
              {/* Messages section */}
            </div>
            <form onSubmit={handleMessageSubmit} className="relative mt-4">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-12 resize-none p-3"
              />
              <div className="flex items-center p-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Paperclip className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Attach File</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Mic className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Use Microphone</TooltipContent>
                </Tooltip>
                <Button
                  type="submit"
                  className="ml-auto"
                  disabled={!message.trim()}
                >
                  Send Message <Send size={20} />
                </Button>
              </div>
            </form>
          </div>

          <div className="relative hidden md:flex flex-col gap-4">
            <Button onClick={handlePlayPause}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />} Play/Pause
            </Button>
            <Button onClick={handleStop}>
              <Square size={20} /> Stop
            </Button>
            <audio ref={audioRef} src="/path-to-your-audio-file" />
          </div>
          <AddCourseDialog />
        </main>
      </div>
    </div>
  );
};

export default Playground;
