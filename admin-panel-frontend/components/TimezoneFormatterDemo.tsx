import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  FormatDate,
  FormatDateTime,
  FormatTimeOnly,
  FormatDateOnly,
  FormatRelativeTime,
} from '@/lib/utils';
import DisplayProperty from './DisplayProperty';

interface TimezoneFormatterDemoProps {
  form: {
    id: string;
    date: string;
    sent_at: string;
    student: {
      name: string;
    };
    reason: string;
  };
}

/**
 * Demo component showcasing the new timezone formatting features
 * This demonstrates how the updated formatters work with automatic timezone detection
 */
export function TimezoneFormatterDemo({ form }: TimezoneFormatterDemoProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <CardTitle>{form.student.name}</CardTitle>
        {/* Now automatically respects user timezone */}
        <CardDescription>{FormatDateOnly(form.date)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="space-y-1.5">
            <DisplayProperty property="Event" value={form.reason} />

            {/* Full date and time with timezone awareness */}
            <DisplayProperty
              property="Sent at (full)"
              value={FormatDateTime(form.sent_at)}
            />

            {/* Just the time portion */}
            <DisplayProperty
              property="Time only"
              value={FormatTimeOnly(form.sent_at)}
            />

            {/* Just the date portion */}
            <DisplayProperty
              property="Date only"
              value={FormatDateOnly(form.sent_at)}
            />

            {/* Relative time formatting */}
            <DisplayProperty
              property="Relative time"
              value={FormatRelativeTime(form.sent_at)}
            />

            {/* Long date format */}
            <DisplayProperty
              property="Long date format"
              value={FormatDate(form.date, { dateStyle: 'full' })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TimezoneFormatterDemo;
