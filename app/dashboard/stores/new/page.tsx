'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Store as StoreIcon, Check } from 'lucide-react';
import { db } from '@/lib/storage/db-service';

const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  description: z.string().optional(),
  logo: z.string().optional(),
  cover_image: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  status: z.enum(['active', 'archived']),
});

type StoreFormValues = z.infer<typeof storeSchema>;

export default function NewStorePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      status: 'active',
    },
  });

  const onSubmit = async (data: StoreFormValues) => {
    try {
      setSubmitting(true);
      const newStore = await db.saveStore(data);
      router.push(`/dashboard/stores/${newStore.id}`);
    } catch (e) {
      console.error('Failed to create store', e);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/stores"
          className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Food Store</h1>
          <p className="text-xs text-slate-500">Add a restaurant to organize menu items & categories</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Store Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. McDonald's, Kopi Kenangan, Warung Padang"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
          />
          {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Description / Tagline</label>
          <textarea
            rows={2}
            {...register('description')}
            placeholder="e.g. Burgers, French Fries, Cold Drinks & Desserts"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Logo Image URL</label>
            <input
              type="url"
              {...register('logo')}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Cover Image URL</label>
            <input
              type="url"
              {...register('cover_image')}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Address / Branch Location</label>
            <input
              type="text"
              {...register('address')}
              placeholder="e.g. Grand Indonesia Lt. LG, Jakarta"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Phone Number</label>
            <input
              type="text"
              {...register('phone')}
              placeholder="e.g. 14045 or 0812345678"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/stores"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Saving Store...' : 'Save & Continue to Menu'}
          </button>
        </div>
      </form>
    </div>
  );
}
