import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import type { ProductFormValues } from '@/lib/schemas';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { TagInput } from '@/components/ui/TagInput';
import { ImageDropzone } from '@/components/ui/ImageDropzone';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';

export interface ProductFormProps {
  form: UseFormReturn<ProductFormValues>;
  categories: { en: string; ar: string }[];
  uploading: boolean;
  saving: boolean;
  onUpload: (files: File[]) => Promise<string[]>;
  onRemoveRemote: (url: string) => Promise<void>;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  title: string;
}

export function ProductForm({
  form,
  categories,
  uploading,
  saving,
  onUpload,
  onRemoveRemote,
  onSubmit,
  title,
}: ProductFormProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [customCategory, setCustomCategory] = useState(false);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [editingSizeIndex, setEditingSizeIndex] = useState<number | null>(null);
  const [sizeForm, setSizeForm] = useState<{ name: string; originalPrice: number | string; salePrice: number | string }>({
    name: '',
    originalPrice: '',
    salePrice: '',
  });
  const [sizeError, setSizeError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const price = watch('price') || 0;
  const originalPrice = watch('originalPrice') || 0;
  const hasOffer = Number(originalPrice) > Number(price) && Number(price) > 0;
  const savingsPercent =
    hasOffer && Number(originalPrice) > 0
      ? Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100)
      : 0;

  const categoryOptions = [
    ...categories.map((c) => ({ value: c.en, label: c.en })),
    { value: '__new__', label: t('products.addCategory') },
  ];

  const openAddSizeModal = () => {
    setEditingSizeIndex(null);
    setSizeForm({ name: '', originalPrice: '', salePrice: '' });
    setSizeError(null);
    setSizeModalOpen(true);
  };

  const openEditSizeModal = (index: number) => {
    const sizes = watch('sizes') || [];
    const item = sizes[index];
    if (!item) return;
    setEditingSizeIndex(index);
    setSizeForm({ name: item.name, originalPrice: item.originalPrice, salePrice: item.salePrice });
    setSizeError(null);
    setSizeModalOpen(true);
  };

  const handleSaveSize = () => {
    const name = sizeForm.name.trim();
    const original = Number(sizeForm.originalPrice);
    const sale = Number(sizeForm.salePrice);

    if (!name) {
      setSizeError(i18n.language === 'ar' ? 'يرجى إدخال اسم الحجم' : 'Please enter a size name');
      return;
    }
    if (isNaN(original) || original < 0 || isNaN(sale) || sale < 0) {
      setSizeError(i18n.language === 'ar' ? 'يرجى إدخال أرقام أسعار صحيحة' : 'Please enter valid positive prices');
      return;
    }

    const currentSizes = [...(watch('sizes') || [])];
    const newSizeItem = { name, originalPrice: original, salePrice: sale };

    if (editingSizeIndex !== null) {
      currentSizes[editingSizeIndex] = newSizeItem;
    } else {
      currentSizes.push(newSizeItem);
    }
    setValue('sizes', currentSizes, { shouldDirty: true, shouldValidate: true });
    setSizeModalOpen(false);
  };

  const handleRemoveSize = (index: number) => {
    const currentSizes = (watch('sizes') || []).filter((_, i) => i !== index);
    setValue('sizes', currentSizes, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      className="space-y-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('products.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {saving ? t('products.saving') : t('products.publish')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('products.englishFields')}
          </h2>
          <Input
            label={t('products.titleEn')}
            dir="ltr"
            error={errors.title?.message ? t('validation.required') : undefined}
            {...register('title')}
          />
          <Textarea
            label={t('products.descriptionEn')}
            dir="ltr"
            error={errors.description?.message ? t('validation.required') : undefined}
            {...register('description')}
          />
          {!customCategory ? (
            <Select
              label={t('products.categoryEn')}
              options={categoryOptions}
              placeholder={t('products.selectCategory')}
              error={errors.category?.message ? t('validation.required') : undefined}
              value={watch('category') || ''}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setCustomCategory(true);
                  setValue('category', '', { shouldDirty: true });
                  return;
                }
                const match = categories.find((c) => c.en === e.target.value);
                setValue('category', e.target.value, { shouldDirty: true, shouldValidate: true });
                if (match) {
                  setValue('categoryAr', match.ar, { shouldDirty: true, shouldValidate: true });
                }
              }}
            />
          ) : (
            <Input
              label={t('products.categoryEn')}
              dir="ltr"
              error={errors.category?.message ? t('validation.required') : undefined}
              {...register('category')}
            />
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('products.arabicFields')}
          </h2>
          <Input
            label={t('products.titleAr')}
            dir="rtl"
            error={errors.titleAr?.message ? t('validation.required') : undefined}
            {...register('titleAr')}
          />
          <Textarea
            label={t('products.descriptionAr')}
            dir="rtl"
            error={errors.descriptionAr?.message ? t('validation.required') : undefined}
            {...register('descriptionAr')}
          />
          <Input
            label={t('products.categoryAr')}
            dir="rtl"
            error={errors.categoryAr?.message ? t('validation.required') : undefined}
            {...register('categoryAr')}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('products.priceLabel')}
              type="number"
              step="0.01"
              min="0"
              error={errors.price?.message ? t('validation.positivePrice') : undefined}
              {...register('price', { valueAsNumber: true })}
            />
            <Input
              label={t('products.originalPriceLabel')}
              type="number"
              step="0.01"
              min="0"
              error={
                errors.originalPrice?.message
                  ? errors.originalPrice.message === 'originalPrice'
                    ? t('validation.originalPrice')
                    : t('validation.positivePrice')
                  : undefined
              }
              {...register('originalPrice', { valueAsNumber: true })}
            />
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">{t('products.finalPrice')}</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(Number(price) || 0, i18n.language)}
            </p>
            {hasOffer ? (
              <p className="text-xs text-success">
                {t('products.discountOff', { value: savingsPercent })} · {t('products.originalPrice')}{' '}
                <span className="line-through">
                  {formatCurrency(Number(originalPrice), i18n.language)}
                </span>
              </p>
            ) : null}
          </div>

          {/* Sizes Section */}
          <div className="rounded-xl border border-border p-4 space-y-4 bg-background/50">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {i18n.language === 'ar' ? 'الأحجام والأسعار (إختياري)' : 'Sizes & Pricing (Optional)'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {i18n.language === 'ar'
                    ? 'إضافة خيارات أحجام متعددة مع أسعار منفصلة (مثل: وسط، كبير)'
                    : 'Add multiple size options with separate pricing (e.g. Small, Large)'}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={openAddSizeModal}>
                {i18n.language === 'ar' ? '+ إضافة حجم' : '+ Add Size'}
              </Button>
            </div>

            {(watch('sizes') || []).length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-3 py-2">{i18n.language === 'ar' ? 'الحجم' : 'Size'}</th>
                      <th className="px-3 py-2">{i18n.language === 'ar' ? 'قبل الخصم' : 'Original Price'}</th>
                      <th className="px-3 py-2">{i18n.language === 'ar' ? 'بعد الخصم' : 'Sale Price'}</th>
                      <th className="px-3 py-2 text-end">{i18n.language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {(watch('sizes') || []).map((sz, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 text-foreground font-bold">{sz.name}</td>
                        <td className="px-3 py-2 text-red-500 line-through">
                          {formatCurrency(Number(sz.originalPrice), i18n.language)}
                        </td>
                        <td className="px-3 py-2 text-success">
                          {formatCurrency(Number(sz.salePrice), i18n.language)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-primary"
                              onClick={() => openEditSizeModal(idx)}
                            >
                              {i18n.language === 'ar' ? 'تعديل' : 'Edit'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleRemoveSize(idx)}
                            >
                              {i18n.language === 'ar' ? 'حذف' : 'Remove'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <Input
            label={t('products.whatsNumber')}
            error={errors.whatsNumber?.message ? t('validation.phone') : undefined}
            {...register('whatsNumber')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('products.ratingLabel')}
              type="number"
              step="0.1"
              min="0"
              max="5"
              error={errors.rating?.message ? t('validation.ratingRange') : undefined}
              {...register('rating', { valueAsNumber: true })}
            />
            <Input
              label={t('products.reviewsLabel')}
              type="number"
              min="0"
              step="1"
              {...register('reviews', { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <Controller
              control={control}
              name="featured"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  label={t('products.featuredLabel')}
                />
              )}
            />
            <Controller
              control={control}
              name="inStock"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  label={t('products.inStockLabel')}
                />
              )}
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput
                label={t('products.tags')}
                value={field.value}
                onChange={field.onChange}
                error={errors.tags?.message ? t('validation.minTags') : undefined}
              />
            )}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">{t('products.images')}</p>
            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <ImageDropzone
                  images={field.value}
                  onChange={field.onChange}
                  onUpload={onUpload}
                  onRemoveRemote={onRemoveRemote}
                  uploading={uploading}
                  error={errors.images?.message ? t('validation.minImages') : undefined}
                />
              )}
            />
          </div>
        </Card>
      </div>

      <Modal
        open={sizeModalOpen}
        onClose={() => setSizeModalOpen(false)}
        title={
          editingSizeIndex !== null
            ? i18n.language === 'ar' ? 'تعديل الحجم' : 'Edit Size'
            : i18n.language === 'ar' ? 'إضافة حجم' : 'Add Size'
        }
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <Input
            label={i18n.language === 'ar' ? 'اسم الحجم (مثل: وسط، كبير، شائعة)' : 'Size Name (e.g. Small, Medium, Large)'}
            value={sizeForm.name}
            onChange={(e) => setSizeForm({ ...sizeForm, name: e.target.value })}
            placeholder={i18n.language === 'ar' ? 'كبير' : 'Large'}
          />
          <Input
            label={i18n.language === 'ar' ? 'السعر قبل الخصم (السعر الأصلي)' : 'Price Before Discount (Original Price)'}
            type="number"
            step="0.01"
            min="0"
            value={sizeForm.originalPrice}
            onChange={(e) => setSizeForm({ ...sizeForm, originalPrice: e.target.value })}
            placeholder="250"
          />
          <Input
            label={i18n.language === 'ar' ? 'السعر بعد الخصم (السعر النهائي)' : 'Price After Discount (Discounted Price)'}
            type="number"
            step="0.01"
            min="0"
            value={sizeForm.salePrice}
            onChange={(e) => setSizeForm({ ...sizeForm, salePrice: e.target.value })}
            placeholder="200"
          />
          {sizeError ? <p className="text-sm font-medium text-destructive">{sizeError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSizeModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSaveSize}>
              {i18n.language === 'ar' ? 'حفظ' : 'Save Size'}
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  );
}
