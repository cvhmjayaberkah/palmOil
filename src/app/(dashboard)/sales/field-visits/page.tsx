"use client";

import { useEffect, useState } from "react";
import { MapPin, Camera, Clock, User, Building } from "lucide-react";
import Loading from "@/components/ui/common/Loading";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface FieldVisit {
  id: string;
  visitDate: Date;
  checkInTime: Date;
  latitude: number;
  longitude: number;
  visitPurpose: string;
  notes?: string;
  photos: string[];
  sales: {
    id: string;
    name: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    address: string;
  } | null;
  customer: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
  storeName?: string;
  storeAddress?: string;
}

export default function FieldVisitsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFieldVisits();
    }
  }, [user]);

  const loadFieldVisits = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/field-visits?salesId=${user.id}`);
      const result = await response.json();

      if (result.success) {
        setFieldVisits(result.data as any);
      }
    } catch (error) {
      console.error("Error loading field visits:", error);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(googleMapsUrl, "_blank");
  };

  if (userLoading || loading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Authentication Required
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Please log in to view your field visits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-800 bg-clip-text text-transparent">
                Riwayat Kunjungan
              </h1>
              <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300">
                Riwayat kunjungan lapangan dengan foto dan lokasi GPS
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Sales Representative
                </p>
                <p className="font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {user?.name || user?.email}
                </p>
              </div>
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Field Visits List */}
        <div className="space-y-6">
          {fieldVisits.length === 0 ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 rounded-2xl -z-10"></div>
              <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full flex items-center justify-center shadow-lg">
                  <Building className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Belum Ada Kunjungan
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Mulai dengan membuat check-in kunjungan lapangan baru.
                </p>
              </div>
            </div>
          ) : (
            fieldVisits.map((visit) => (
              <div key={visit.id} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-white via-green-50 to-emerald-50 dark:from-gray-800/50 dark:via-green-900/10 dark:to-emerald-900/10 rounded-2xl -z-10"></div>
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]">
                  {/* Visit Header */}
                  <div className="relative bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 p-6">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">
                              {visit.sales.name}
                            </h3>
                            <p className="text-green-100">
                              {visit.sales.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-100 font-medium">
                            Tujuan Kunjungan
                          </p>
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                            <span className="text-white font-semibold capitalize">
                              {visit.visitPurpose
                                .replace(/([A-Z])/g, " $1")
                                .trim()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
                  </div>

                  <div className="p-6 lg:p-8">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Visit Details */}
                      <div className="space-y-6">
                        {/* Store Information */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl -z-10"></div>
                          <div className="relative bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                            <h4 className="flex items-center text-lg font-bold text-gray-900 dark:text-white mb-3">
                              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mr-3"></div>
                              Informasi Toko
                            </h4>
                            <div className="space-y-2">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {visit.customer?.name ||
                                  visit.store?.name ||
                                  visit.storeName ||
                                  "Unknown Store"}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {visit.customer?.address ||
                                  visit.store?.address ||
                                  visit.storeAddress ||
                                  "No address"}
                              </p>
                              {visit.customer?.city && (
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                  📍 {visit.customer.city}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Date & Time */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl -z-10"></div>
                          <div className="relative bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                            <h4 className="flex items-center text-lg font-bold text-gray-900 dark:text-white mb-3">
                              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3"></div>
                              Waktu Kunjungan
                            </h4>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {new Date(visit.visitDate).toLocaleDateString(
                                    "id-ID",
                                    {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                                  <Clock className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Check-in:{" "}
                                  {new Date(
                                    visit.checkInTime
                                  ).toLocaleTimeString("id-ID")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl -z-10"></div>
                          <div className="relative bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                            <h4 className="flex items-center text-lg font-bold text-gray-900 dark:text-white mb-3">
                              <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mr-3"></div>
                              Lokasi GPS
                            </h4>
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-mono text-emerald-700 dark:text-emerald-300">
                                  Lat: {visit.latitude.toFixed(6)}
                                </p>
                                <p className="text-sm font-mono text-emerald-700 dark:text-emerald-300">
                                  Lng: {visit.longitude.toFixed(6)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  openInMaps(visit.latitude, visit.longitude)
                                }
                                className="group flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                              >
                                <MapPin className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                                <span>Buka Maps</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {visit.notes && (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl -z-10"></div>
                            <div className="relative bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                              <h4 className="flex items-center text-lg font-bold text-gray-900 dark:text-white mb-3">
                                <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mr-3"></div>
                                Catatan
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {visit.notes}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Photos */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/10 dark:to-gray-900/10 rounded-xl -z-10"></div>
                        <div className="relative bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 h-full">
                          <h4 className="flex items-center text-lg font-bold text-gray-900 dark:text-white mb-4">
                            <div className="w-2 h-2 bg-gradient-to-r from-slate-500 to-gray-500 rounded-full mr-3"></div>
                            Foto Kunjungan
                            <span className="ml-2 px-2 py-1 bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-700 dark:to-gray-700 text-xs font-medium rounded-full">
                              {visit.photos.length}
                            </span>
                          </h4>
                          {visit.photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                              {visit.photos.map((photo, index) => (
                                <div key={index} className="relative group">
                                  <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={photo}
                                      alt={`Visit photo ${index + 1}`}
                                      className="h-32 w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
                                      onClick={() =>
                                        window.open(photo, "_blank")
                                      }
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full">
                                        <Camera className="h-5 w-5 text-white drop-shadow-lg" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="w-16 h-16 mb-4 bg-gradient-to-r from-gray-200 to-slate-300 dark:from-gray-600 dark:to-slate-600 rounded-full flex items-center justify-center">
                                <Camera className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                Tidak ada foto pada kunjungan ini
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
