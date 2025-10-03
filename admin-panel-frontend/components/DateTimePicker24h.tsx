"use client";

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn, FormatDateTimeForDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTimeZone } from "next-intl";

type DateTimePicker24hProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
};

export function DateTimePicker24h({ value, onChange }: DateTimePicker24hProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timeZone = useTimeZone();

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const prev = value || new Date();
      const newDate = new Date(selectedDate);
      newDate.setHours(prev.getHours());
      newDate.setMinutes(prev.getMinutes());
      newDate.setSeconds(0);
      onChange(newDate);
    }
  };

  const handleTimeChange = (type: "hour" | "minute", val: string) => {
    if (value) {
      const newDate = new Date(value);
      if (type === "hour") {
        newDate.setHours(parseInt(val));
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(val));
      }
      newDate.setSeconds(0);
      onChange(newDate);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            <span>
              {FormatDateTimeForDisplay(value)}
              <span className="ml-2 text-xs text-muted-foreground">
                ({timeZone})
              </span>
            </span>
          ) : (
            <span>Select date and time</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="sm:flex">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleDateSelect}
            initialFocus
            disabled={{ before: new Date() }}
          />
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {hours.map((hour) => {
                  const now = new Date();
                  const isToday =
                    value &&
                    value.getFullYear() === now.getFullYear() &&
                    value.getMonth() === now.getMonth() &&
                    value.getDate() === now.getDate();

                  const isPastHour = !!(isToday && hour < now.getHours());

                  return (
                    <Button
                      key={hour}
                      size="icon"
                      variant={
                        value && value.getHours() === hour ? "default" : "ghost"
                      }
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() => handleTimeChange("hour", hour.toString())}
                      disabled={isPastHour}
                    >
                      {hour.toString().padStart(2, "0")}
                    </Button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {minutes.map((minute) => {
                  const now = new Date();
                  const isToday =
                    value &&
                    value.getFullYear() === now.getFullYear() &&
                    value.getMonth() === now.getMonth() &&
                    value.getDate() === now.getDate();

                  const isSameHour =
                    value && value.getHours() === now.getHours();
                  const isPastMinute = !!(
                    isToday &&
                    isSameHour &&
                    minute < now.getMinutes()
                  );

                  return (
                    <Button
                      key={minute}
                      size="icon"
                      variant={
                        value && value.getMinutes() === minute
                          ? "default"
                          : "ghost"
                      }
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() =>
                        handleTimeChange("minute", minute.toString())
                      }
                      disabled={isPastMinute}
                    >
                      {minute.toString().padStart(2, "0")}
                    </Button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
          </div>
        </div>
        {/* Show current timezone info */}
        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          Times shown in {timeZone}
        </div>
      </PopoverContent>
    </Popover>
  );
}
