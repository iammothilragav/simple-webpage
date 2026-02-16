'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeleteAlert } from '@/app/(main)/event-calendar/ui/delete-alert';
import { FormFooter } from '@/app/(main)/event-calendar/ui/form-footer';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ensureDate } from '@/lib/date';
import { useEventCalendarStore } from '@/hooks/use-event';
import { eventFormSchema, EventFormValues } from '@/lib/validations';
import { EventDetailsForm } from './event-detail-form';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { getLocaleFromCode } from '@/lib/event';
import { client } from '@/server/client';
import { useRouter } from 'next/navigation';

const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '10:00';
const DEFAULT_COLOR = 'bg-red-600';
const DEFAULT_CATEGORY = 'workshop';



const DEFAULT_FORM_VALUES: EventFormValues = {
  title: '',
  description: '',
  startDate: new Date(),
  endDate: new Date(),
  category: DEFAULT_CATEGORY,
  startTime: DEFAULT_START_TIME,
  endTime: DEFAULT_END_TIME,
  location: '',
  color: DEFAULT_COLOR,
};

function useIsMounted() {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  return isMounted;
}

export default function EventDialog() {
  const {
    locale,
    selectedEvent,
    isDialogOpen,
    closeEventDialog,
    isSubmitting,
  } = useEventCalendarStore(
    useShallow((state) => ({
      locale: state.locale,
      selectedEvent: state.selectedEvent,
      isDialogOpen: state.isDialogOpen,
      closeEventDialog: state.closeEventDialog,
      isSubmitting: state.isSubmitting,
    })),
  );
  const localeObj = getLocaleFromCode(locale);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);
  const isMounted = useIsMounted();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onChange',
  });

  useEffect(() => {
    if (selectedEvent) {
      try {
        const startDate = ensureDate(selectedEvent.startDate);
        const endDate = ensureDate(selectedEvent.endDate);

        form.reset({
          title: selectedEvent.title || '',
          description: selectedEvent.description || '',
          startDate,
          endDate,
          category: selectedEvent.category || DEFAULT_CATEGORY,
          startTime: selectedEvent.startTime || DEFAULT_START_TIME,
          endTime: selectedEvent.endTime || DEFAULT_END_TIME,
          location: selectedEvent.location || '',
          color: selectedEvent.color,
        });
      } catch (error) {
        console.error('Error resetting form with event data:', error);
      }
    }
  }, [selectedEvent, form]);

  const router = useRouter();

  const handleUpdate = async (values: EventFormValues) => {
    if (!selectedEvent?.id) return;

    const updateEventPromise = async () => {
      const response = await client.api.events[':id'].$patch({
        param: { id: selectedEvent.id },
        json: values,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          'error' in errorData
            ? (errorData.error as string)
            : 'Failed to update event'
        );
      }

      router.refresh();
      return { success: true };
    };

    toast.promise(updateEventPromise(), {
      loading: 'Updating event...',
      success: (result) => {
        closeEventDialog();
        return 'Event updated successfully!';
      },
      error: (error) => {
        console.error('Error:', error);
        return error instanceof Error
          ? error.message
          : 'Ops! Something went wrong';
      },
    });
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;
    setIsDeleteAlertOpen(false);

    const deleteEventPromise = async () => {
      const response = await client.api.events[':id'].$delete({
        param: { id: selectedEvent.id },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          'error' in errorData
            ? (errorData.error as string)
            : 'Failed to delete event'
        );
      }

      router.refresh();
      return { success: true };
    };

    toast.promise(deleteEventPromise(), {
      loading: 'Deleting event...',
      success: (result) => {
        closeEventDialog();
        return 'Event deleted successfully!';
      },
      error: (error) => {
        console.error('Error:', error);
        return error instanceof Error
          ? error.message
          : 'Ops! Something went wrong';
      },
    });
  };

  if (!isMounted) return null;

  return (
    <Dialog open={isDialogOpen} onOpenChange={closeEventDialog} modal={false}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
          <DialogDescription>
            Event details {selectedEvent?.title}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[350px] w-full sm:h-[500px]">
          <EventDetailsForm
            form={form}
            onSubmit={handleUpdate}
            locale={localeObj}
          />
        </ScrollArea>
        <DialogFooter className="mt-2 flex flex-row">
          <DeleteAlert
            isOpen={isDeleteAlertOpen}
            onOpenChange={setIsDeleteAlertOpen}
            onConfirm={handleDeleteEvent}
          />
          <FormFooter
            onCancel={closeEventDialog}
            onSave={form.handleSubmit(handleUpdate)}
            isSubmitting={isSubmitting}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
