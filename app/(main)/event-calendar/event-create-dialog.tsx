'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEventCalendarStore } from '@/hooks/use-event';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventDetailsForm } from './event-detail-form';
import { EventPreviewCalendar } from './event-preview-calendar';
import { createEventSchema, eventFormSchema, EventFormValues } from '@/lib/validations';
import { EVENT_DEFAULTS } from '@/constants/calendar-constant';
import { useShallow } from 'zustand/shallow';
import { toast } from 'sonner';
import { getLocaleFromCode } from '@/lib/event';
import { client } from '@/server/client';
import { useRouter } from 'next/navigation';



const DEFAULT_FORM_VALUES: EventFormValues = {
  title: '',
  description: '',
  startDate: new Date(),
  endDate: new Date(),
  category: EVENT_DEFAULTS.CATEGORY,
  startTime: EVENT_DEFAULTS.START_TIME,
  endTime: EVENT_DEFAULTS.END_TIME,
  location: '',
  color: EVENT_DEFAULTS.COLOR,
  isRepeating: false,
};

export default function EventCreateDialog() {
  const {
    isQuickAddDialogOpen,
    closeQuickAddDialog,
    timeFormat,
    locale,
    quickAddData,
  } = useEventCalendarStore(
    useShallow((state) => ({
      isQuickAddDialogOpen: state.isQuickAddDialogOpen,
      closeQuickAddDialog: state.closeQuickAddDialog,
      timeFormat: state.timeFormat,
      locale: state.locale,
      quickAddData: state.quickAddData,
    })),
  );
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onChange',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const localeObj = getLocaleFromCode(locale);

  const watchedValues = form.watch();

  const router = useRouter();

  const handleSubmit = async (formValues: EventFormValues) => {
    setIsSubmitting(true);

    const createEventPromise = async () => {
      const response = await client.api.events.$post({
        json: formValues,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          'error' in errorData
            ? (errorData.error as string)
            : 'Failed to create event'
        );
      }

      router.refresh();
      return { success: true };
    };

    toast.promise(createEventPromise(), {
      loading: 'Creating Event...',
      success: (result) => {
        form.reset(DEFAULT_FORM_VALUES);
        setIsSubmitting(false);
        closeQuickAddDialog();
        return 'Event Succesfully created';
      },
      error: (error) => {
        console.error('Error:', error);
        setIsSubmitting(false); 
        if (error instanceof Error) {
          return error.message;
        } else if (typeof error === 'string') {
          return error;
        } else if (error && typeof error === 'object' && 'message' in error) {
          return String(error.message);
        }
        return 'Ops! something went wrong';
      },
    });
  };

  useEffect(() => {
    if (isQuickAddDialogOpen && quickAddData.date) {
      form.reset({
        ...DEFAULT_FORM_VALUES,
        startDate: quickAddData.date,
        endDate: quickAddData.date,
        startTime: quickAddData.startTime,
        endTime: quickAddData.endTime,
      });
    }
  }, [isQuickAddDialogOpen, quickAddData, form]);

  return (
    <Dialog
      open={isQuickAddDialogOpen}
      onOpenChange={(open) => !open && closeQuickAddDialog()}
      modal={false}
    >
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
          <DialogDescription>
            Fill in the event details to add it to the calendar
          </DialogDescription>
        </DialogHeader>
        <Tabs className="w-full" defaultValue="edit">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-4">
            <ScrollArea className="h-[500px] w-full">
              <EventDetailsForm
                form={form}
                onSubmit={handleSubmit}
                locale={localeObj}
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <ScrollArea className="h-[500px] w-full">
              <EventPreviewCalendar
                watchedValues={watchedValues}
                locale={localeObj}
                timeFormat={timeFormat}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-2">
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            className="cursor-pointer"
            disabled={isSubmitting}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
