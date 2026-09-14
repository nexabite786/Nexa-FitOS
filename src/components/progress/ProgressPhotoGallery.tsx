/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Camera,
  Plus,
  Lock,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Columns,
  Grid3X3,
  Calendar,
  Scale,
  Trash2,
  Upload,
  AlertCircle,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { ProgressPhotoEntry, PhotoCategory, PhotoVisibility, WeightUnit } from '../../types/progress';

interface ProgressPhotoGalleryProps {
  photos: ProgressPhotoEntry[];
  onAddPhoto: (data: Omit<ProgressPhotoEntry, 'id' | 'tenantId' | 'clientId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdatePhoto?: (id: string, data: Partial<ProgressPhotoEntry>) => Promise<void>;
  onDeletePhoto?: (id: string) => Promise<void>;
  latestWeight?: number;
  weightUnit?: WeightUnit;
  isCoachView?: boolean;
}

type ViewMode = 'GRID' | 'COMPARE' | 'SLIDER';

export const ProgressPhotoGallery: React.FC<ProgressPhotoGalleryProps> = ({
  photos,
  onAddPhoto,
  onUpdatePhoto,
  onDeletePhoto,
  latestWeight,
  weightUnit = 'kg',
  isCoachView = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhotoEntry | null>(null);

  // Compare mode selection
  const [compareBeforeId, setCompareBeforeId] = useState<string | null>(null);
  const [compareAfterId, setCompareAfterId] = useState<string | null>(null);

  // Interactive slider position (0 - 100)
  const [sliderPos, setSliderPos] = useState<number>(50);

  // Upload Form State
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>('FRONT');
  const [customTag, setCustomTag] = useState<string>('');
  const [uploadVisibility, setUploadVisibility] = useState<PhotoVisibility>('CLIENT_ONLY');
  const [recordedAt, setRecordedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weightSnapshot, setWeightSnapshot] = useState<string>(latestWeight ? String(latestWeight) : '');
  const [notes, setNotes] = useState<string>('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sort photos chronologically (newest first for gallery)
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }, [photos]);

  // Filtered by category
  const filteredPhotos = useMemo(() => {
    if (selectedCategory === 'ALL') return sortedPhotos;
    return sortedPhotos.filter(p => p.category === selectedCategory);
  }, [sortedPhotos, selectedCategory]);

  // Set default comparison items when switching to compare
  const beforePhoto = useMemo(() => {
    if (compareBeforeId) return photos.find(p => p.id === compareBeforeId) || null;
    // Default: oldest photo
    return sortedPhotos.length > 1 ? sortedPhotos[sortedPhotos.length - 1] : null;
  }, [photos, compareBeforeId, sortedPhotos]);

  const afterPhoto = useMemo(() => {
    if (compareAfterId) return photos.find(p => p.id === compareAfterId) || null;
    // Default: newest photo
    return sortedPhotos.length > 0 ? sortedPhotos[0] : null;
  }, [photos, compareAfterId, sortedPhotos]);

  // Handle image upload and compression
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        // Compress using Canvas (max 1200px width/height)
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoDataUrl(compressedDataUrl);
        setFormError(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoDataUrl) {
      setFormError('Please select or take a photo first.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      await onAddPhoto({
        photoUrl: photoDataUrl,
        category: uploadCategory,
        customTag: uploadCategory === 'CUSTOM' ? customTag : undefined,
        visibility: uploadVisibility,
        recordedAt,
        weightSnapshot: weightSnapshot ? parseFloat(weightSnapshot) : undefined,
        weightUnit: weightUnit,
        notes: notes.trim()
      });

      setIsUploadModalOpen(false);
      setPhotoDataUrl(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save progress photo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeletePhoto) return;
    if (window.confirm('Are you sure you want to delete this progress photo?')) {
      try {
        await onDeletePhoto(id);
        if (selectedPhoto?.id === id) setSelectedPhoto(null);
      } catch (err: any) {
        console.error('Delete photo failed:', err);
      }
    }
  };

  const handleToggleVisibility = async (photo: ProgressPhotoEntry) => {
    if (!onUpdatePhoto) return;
    const newVis: PhotoVisibility =
      photo.visibility === 'CLIENT_ONLY' ? 'TRAINER_AND_OWNER' : 'CLIENT_ONLY';
    try {
      await onUpdatePhoto(photo.id, { visibility: newVis });
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto({ ...selectedPhoto, visibility: newVis });
      }
    } catch (err: any) {
      console.error('Update visibility failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Zero-Trust Privacy Gating:</span> Photos
            are strictly confidential and default to <strong>Client Only</strong>. You control coach
            visibility per photo.
          </div>
        </div>

        {!isCoachView && (
          <button
            id="btn-upload-photo"
            onClick={() => {
              setPhotoDataUrl(null);
              setFormError(null);
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-400 transition-all shadow-md shadow-purple-500/20 text-xs shrink-0 self-start sm:self-auto"
          >
            <Camera className="w-4 h-4" />
            Upload Photo
          </button>
        )}
      </div>

      {/* Control Bar: Categories & View Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border/40">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'FRONT', 'SIDE', 'BACK', 'CUSTOM'] as Array<PhotoCategory | 'ALL'>).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
              }`}
            >
              {cat === 'ALL' ? 'All Angles' : cat}
            </button>
          ))}
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/30 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('GRID')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'GRID'
                ? 'bg-purple-500 text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Gallery
          </button>
          <button
            onClick={() => setViewMode('COMPARE')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'COMPARE'
                ? 'bg-purple-500 text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('SLIDER')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              viewMode === 'SLIDER'
                ? 'bg-purple-500 text-white font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Slider
          </button>
        </div>
      </div>

      {/* 1. GRID VIEW MODE */}
      {viewMode === 'GRID' && (
        <>
          {filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredPhotos.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-card/60 border border-border/40 cursor-pointer hover:border-purple-500/50 transition-all shadow-sm"
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.category}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold tracking-wider text-purple-300 uppercase">
                      {photo.category}
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] flex items-center gap-1 backdrop-blur-md ${
                        photo.visibility === 'TRAINER_AND_OWNER'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-black/60 text-muted-foreground'
                      }`}
                    >
                      {photo.visibility === 'TRAINER_AND_OWNER' ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                    </span>
                  </div>

                  {/* Bottom Metadata */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-xs text-white">
                    <div className="font-semibold text-xs truncate">{photo.recordedAt.split('T')[0]}</div>
                    {photo.weightSnapshot && (
                      <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-0.5">
                        <Scale className="w-3 h-3" />
                        {photo.weightSnapshot} {photo.weightUnit || 'kg'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm bg-card/20 rounded-2xl border border-dashed border-border/40">
              No photos found in this category. Upload a physique photo to track your transformation!
            </div>
          )}
        </>
      )}

      {/* 2. SIDE-BY-SIDE COMPARE MODE */}
      {viewMode === 'COMPARE' && (
        <div className="space-y-6">
          {sortedPhotos.length >= 2 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before Card */}
              <div className="bg-card/40 p-4 rounded-2xl border border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Baseline (Before)
                  </span>
                  <select
                    value={beforePhoto?.id || ''}
                    onChange={e => setCompareBeforeId(e.target.value)}
                    className="bg-background border border-border text-xs px-2.5 py-1.5 rounded-lg text-foreground"
                  >
                    {sortedPhotos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.recordedAt.split('T')[0]} — {p.category}{' '}
                        {p.weightSnapshot ? `(${p.weightSnapshot}${p.weightUnit || 'kg'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {beforePhoto && (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black/40 border border-border/30">
                    <img
                      src={beforePhoto.photoUrl}
                      alt="Before"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded-xl text-xs flex items-center justify-between text-white">
                      <span>{beforePhoto.recordedAt.split('T')[0]}</span>
                      {beforePhoto.weightSnapshot && (
                        <span className="text-amber-400 font-bold">
                          {beforePhoto.weightSnapshot} {beforePhoto.weightUnit || 'kg'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* After Card */}
              <div className="bg-card/40 p-4 rounded-2xl border border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Current (After)
                  </span>
                  <select
                    value={afterPhoto?.id || ''}
                    onChange={e => setCompareAfterId(e.target.value)}
                    className="bg-background border border-border text-xs px-2.5 py-1.5 rounded-lg text-foreground"
                  >
                    {sortedPhotos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.recordedAt.split('T')[0]} — {p.category}{' '}
                        {p.weightSnapshot ? `(${p.weightSnapshot}${p.weightUnit || 'kg'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {afterPhoto && (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black/40 border border-border/30">
                    <img
                      src={afterPhoto.photoUrl}
                      alt="After"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded-xl text-xs flex items-center justify-between text-white">
                      <span>{afterPhoto.recordedAt.split('T')[0]}</span>
                      {afterPhoto.weightSnapshot && (
                        <span className="text-amber-400 font-bold">
                          {afterPhoto.weightSnapshot} {afterPhoto.weightUnit || 'kg'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm bg-card/20 rounded-2xl border border-dashed border-border/40">
              Need at least 2 photos logged to perform a side-by-side transformation comparison.
            </div>
          )}
        </div>
      )}

      {/* 3. SLIDER BEFORE/AFTER MODE */}
      {viewMode === 'SLIDER' && (
        <div className="bg-card/40 p-6 rounded-2xl border border-border/40 space-y-4">
          {beforePhoto && afterPhoto ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  <strong>Left:</strong> {beforePhoto.recordedAt.split('T')[0]} (
                  {beforePhoto.weightSnapshot ? `${beforePhoto.weightSnapshot}${beforePhoto.weightUnit || 'kg'}` : 'Before'})
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <strong>Right:</strong> {afterPhoto.recordedAt.split('T')[0]} (
                  {afterPhoto.weightSnapshot ? `${afterPhoto.weightSnapshot}${afterPhoto.weightUnit || 'kg'}` : 'After'})
                </div>
              </div>

              {/* Interactive Split Slider View */}
              <div className="relative max-w-lg mx-auto aspect-[3/4] rounded-2xl overflow-hidden select-none shadow-2xl border border-border/40">
                {/* Background Image (After) */}
                <img
                  src={afterPhoto.photoUrl}
                  alt="After"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Foreground Image (Before) clipped */}
                <div
                  className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-2xl"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={beforePhoto.photoUrl}
                    alt="Before"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                {/* Draggable divider handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-8 h-8 rounded-full bg-white text-black shadow-lg flex items-center justify-center text-xs font-bold -ml-3.5">
                    ⟷
                  </div>
                </div>

                {/* Invisible input range for slider control */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={e => setSliderPos(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10"
                />
              </div>

              <div className="text-center text-xs text-muted-foreground">
                Drag the slider left and right to interactively inspect muscle transformation
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Please log at least 2 photos to use the comparison slider.
            </div>
          )}
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            {/* Left: Image Canvas */}
            <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[300px]">
              <img
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.category}
                referrerPolicy="no-referrer"
                className="max-h-[85vh] w-auto object-contain"
              />
            </div>

            {/* Right: Info & Actions */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between space-y-4 bg-card">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
                    {selectedPhoto.category}
                  </span>
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Recorded Date</div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    {selectedPhoto.recordedAt.split('T')[0]}
                  </div>
                </div>

                {selectedPhoto.weightSnapshot && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Logged Body Weight</div>
                    <div className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      {selectedPhoto.weightSnapshot} {selectedPhoto.weightUnit || 'kg'}
                    </div>
                  </div>
                )}

                {selectedPhoto.notes && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Notes</div>
                    <div className="text-xs text-foreground/80 italic bg-muted/20 p-3 rounded-xl">
                      "{selectedPhoto.notes}"
                    </div>
                  </div>
                )}

                {/* Privacy Toggle (for clients) */}
                {!isCoachView && onUpdatePhoto && (
                  <div className="pt-2 border-t border-border/30 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">Sharing Permission</div>
                    <button
                      onClick={() => handleToggleVisibility(selectedPhoto)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                        selectedPhoto.visibility === 'TRAINER_AND_OWNER'
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                          : 'bg-muted/30 border-border/40 text-muted-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {selectedPhoto.visibility === 'TRAINER_AND_OWNER' ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                        {selectedPhoto.visibility === 'TRAINER_AND_OWNER'
                          ? 'Shared with Coach & Gym'
                          : 'Private (Client Only)'}
                      </span>
                      <span className="text-[10px] underline">Toggle</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Action */}
              {onDeletePhoto && !isCoachView && (
                <button
                  onClick={() => handleDelete(selectedPhoto.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="text-lg font-bold text-foreground">Add Progress Photo</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo Input / Drop Zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select Photo</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/60 hover:border-purple-500/60 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-background/50 flex flex-col items-center justify-center min-h-[160px]"
                >
                  {photoDataUrl ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden">
                      <img
                        src={photoDataUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold opacity-0 hover:opacity-100 transition-opacity">
                        Click to change photo
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-medium text-foreground">
                        Click to upload or drag & drop
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        PNG, JPG, or WebP up to 10MB
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Category Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Photo Category</label>
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value as PhotoCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-medium"
                  >
                    <option value="FRONT">Front Angle</option>
                    <option value="SIDE">Side Angle</option>
                    <option value="BACK">Back Angle</option>
                    <option value="CUSTOM">Custom Angle</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Recorded Date</label>
                  <input
                    type="date"
                    value={recordedAt}
                    onChange={e => setRecordedAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs"
                  />
                </div>
              </div>

              {uploadCategory === 'CUSTOM' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Custom Angle Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Bicep Flex, Quad Close-up"
                    value={customTag}
                    onChange={e => setCustomTag(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs"
                  />
                </div>
              )}

              {/* Weight snapshot & Visibility */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Weight at Capture ({weightUnit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 80.2"
                    value={weightSnapshot}
                    onChange={e => setWeightSnapshot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Privacy Setting</label>
                  <select
                    value={uploadVisibility}
                    onChange={e => setUploadVisibility(e.target.value as PhotoVisibility)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-medium"
                  >
                    <option value="CLIENT_ONLY">🔒 Client Only (Private)</option>
                    <option value="TRAINER_AND_OWNER">👁️ Share with Coach & Gym</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Week 8 morning pump check"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={150}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !photoDataUrl}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-500 text-white hover:bg-purple-400 disabled:opacity-50 transition-all shadow-md shadow-purple-500/20"
                >
                  {isSubmitting ? 'Uploading...' : 'Save Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
