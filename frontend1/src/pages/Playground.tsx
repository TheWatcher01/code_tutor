// File path: code_tutor/frontend/src/pages/Playground.tsx

import { useState, useRef } from 'react';
import { Play, Pause, Square, Send, Settings, Paperclip, Mic, Triangle, SquareTerminal } from 'lucide-react';
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Textarea } from "@components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@components/ui/tooltip";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@components/ui/select";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@components/ui/drawer";
import { ModeToggle } from "@components/modeToggle";
import AddCourseDialog from "@components/AddCourseDialog";

const Playground = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
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
              <Button variant="ghost" size="icon" className="rounded-lg bg-muted" aria-label="Playground">
                <SquareTerminal className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>Playground</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-lg" aria-label="Settings">
                <Settings className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>Settings</TooltipContent>
          </Tooltip>
        </nav>
      </aside>
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
          <h1 className="text-xl font-semibold">Playground</h1>
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
            <Badge variant="outline" className="absolute right-3 top-3">Output</Badge>
            <div className="flex-1 overflow-y-auto">
              {/* Messages section */}
            </div>
            <form className="relative mt-4">
              <Textarea id="message" placeholder="Type your message here..." className="min-h-12 resize-none p-3" />
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
                <Button type="submit" className="ml-auto">Send Message <Send size={20} /></Button>
              </div>
            </form>
          </div>
          {/* Media controls */}
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
