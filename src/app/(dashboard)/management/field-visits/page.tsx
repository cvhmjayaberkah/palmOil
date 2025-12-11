"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/common/Button";
import Card from "@/components/ui/common/Card";
import Badge from "@/components/ui/common/Badge";
import Modal from "@/components/ui/common/Modal";
import {
  Trash2,
  Eye,
  MapPin,
  Calendar,
  User,
  Store,
  Loader2,
  Image,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/utils/formatDate";

interface FieldVisit {
  id: string;
  visitPurpose: string;
  notes: string | null;
  latitude: number;
  longitude: number;
  photos: string[];
  checkInTime: Date;
  visitDate: Date;
  createdAt: Date;
  sales: {
    name: string;
    email: string;
  };
  customer: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
}

export default function FieldVisitsPage() {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadVisits = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/field-visits");
      const result = await response.json();
      if (result.success) {
        setVisits(result.data);
      } else {
        showMessage("error", "Failed to load field visits");
      }
    } catch (error) {
      showMessage("error", "Error loading field visits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const handleDelete = async (visitId: string) => {
    setDeleteLoading(visitId);
    try {
      const response = await fetch(`/api/field-visits?visitId=${visitId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showMessage("success", "Visit deleted successfully");
        await loadVisits(); // Refresh the list
        setShowDeleteModal(null);
      } else {
        showMessage("error", result.error || "Failed to delete visit");
      }
    } catch (error) {
      showMessage("error", "Error deleting visit");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      const response = await fetch("/api/field-visits?deleteAll=true", {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showMessage("success", "All visits deleted successfully");
        await loadVisits(); // Refresh the list
        setShowDeleteAllModal(false);
      } else {
        showMessage("error", result.error || "Failed to delete all visits");
      }
    } catch (error) {
      showMessage("error", "Error deleting all visits");
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleLocationClick = (latitude: number, longitude: number) => {
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(googleMapsUrl, "_blank");
  };

  const PhotoViewer = ({ photos }: { photos: string[] }) => {
    if (!photos || photos.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-center text-gray-500">
            <Image className="mx-auto h-12 w-12 mb-3 text-gray-400" />
            <p className="text-base font-medium">No Photos Available</p>
            <p className="text-sm text-gray-400 mt-1">
              Photos will appear here when uploaded
            </p>
          </div>
        </div>
      );
    }

    const handlePhotoClick = (photo: string) => {
      // Extract filename and create full URL
      const photoUrl = photo.startsWith("http")
        ? photo
        : `https://erp.hmjayaberkah.com${photo}`;
      window.open(photoUrl, "_blank");
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="relative group cursor-pointer transform transition-all duration-200 hover:scale-[1.02]"
            onClick={() => handlePhotoClick(photo)}
          >
            <div className="aspect-[4/3] relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-shadow duration-200">
              <img
                src={photo}
                alt={`Field visit photo ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-image.png";
                }}
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-white rounded-full p-2 shadow-lg">
                    <Eye className="h-5 w-5 text-gray-700" />
                  </div>
                </div>
              </div>
            </div>
            {/* Photo number badge */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
              {index + 1} of {photos.length}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Messages */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 -mx-4 -mt-6 mb-8 px-6 py-8 text-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3 flex items-center">
              <MapPin className="h-8 w-8 mr-3" />
              Field Visit Logs
            </h1>
            <p className="text-blue-100 dark:text-blue-200 text-lg mb-3">
              Comprehensive management and tracking of sales field visit records
            </p>
            <div className="flex flex-wrap items-center gap-3 text-blue-200 dark:text-blue-300">
              <span className="bg-blue-500 dark:bg-blue-600 bg-opacity-50 px-4 py-2 rounded-full text-sm font-medium">
                Total Visits: {visits.length}
              </span>
              {visits.length > 0 && (
                <span className="bg-green-500 dark:bg-green-600 bg-opacity-50 px-4 py-2 rounded-full text-sm font-medium">
                  Active Records
                </span>
              )}
            </div>
          </div>

          {visits.length > 0 && (
            <Button
              variant="danger"
              size="medium"
              onClick={() => setShowDeleteAllModal(true)}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 border-none shadow-lg text-white flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Visits
            </Button>
          )}
        </div>
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 max-w-md mx-auto border border-gray-200 shadow-sm">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              No Field Visits Yet
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              Field visit records will appear here once your sales team starts
              logging their visits.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-sm font-medium">
                💡 Sales representatives can log visits through the mobile app
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {visits.map((visit) => (
            <Card
              key={visit.id}
              className="hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 min-h-[400px]"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                      {visit.visitPurpose}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-full w-fit">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(visit.visitDate).toLocaleString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => setSelectedVisit(visit)}
                      className="h-10 w-10 p-0 hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-600 border-gray-300 dark:border-gray-600"
                    >
                      <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </Button>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => setShowDeleteModal(visit.id)}
                      className="h-10 w-10 p-0 hover:bg-red-50 dark:hover:bg-red-900 hover:border-red-300 dark:hover:border-red-600 border-gray-300 dark:border-gray-600"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-200 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <User className="h-5 w-5 mr-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-green-800 dark:text-green-300 text-xs uppercase tracking-wide mb-1">
                        Sales Representative
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {visit.sales.name}
                      </p>
                    </div>
                  </div>

                  {visit.customer && (
                    <>
                      <div className="flex items-center text-sm text-gray-700 dark:text-gray-200 bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <Store className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-purple-800 dark:text-purple-300 text-xs uppercase tracking-wide mb-1">
                            Customer Name
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white break-words">
                            {visit.customer.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start text-sm text-gray-700 dark:text-gray-200 bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                        <MapPin className="h-5 w-5 mr-3 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-orange-800 dark:text-orange-300 text-xs uppercase tracking-wide mb-1">
                            Address
                          </p>
                          <p className="text-gray-900 dark:text-white leading-relaxed break-words">
                            📍 {visit.customer.city} - {visit.customer.address}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {visit.photos.length > 0 && (
                    <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-rose-200 dark:border-rose-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Image className="h-4 w-4 mr-2 text-rose-600 dark:text-rose-400" />
                          <Badge
                            colorScheme="gray"
                            className="text-xs bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200 px-2 py-1"
                          >
                            {visit.photos.length} photo
                            {visit.photos.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="flex -space-x-2">
                          {visit.photos.slice(0, 4).map((photo, index) => (
                            <div
                              key={index}
                              className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-110 transform"
                              onClick={() => {
                                const photoUrl = photo.startsWith("http")
                                  ? photo
                                  : `https://erp.hmjayaberkah.com${photo}`;
                                window.open(photoUrl, "_blank");
                              }}
                            >
                              <img
                                src={photo}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/placeholder-image.png";
                                }}
                              />
                            </div>
                          ))}
                          {visit.photos.length > 4 && (
                            <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-xs text-gray-700 dark:text-gray-200 font-bold shadow-md">
                              +{visit.photos.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                        Click photos to view full size
                      </p>
                    </div>
                  )}

                  {/* Visit Notes Preview */}
                  {visit.notes && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="font-semibold text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wide mb-2">
                        Visit Notes
                      </p>
                      <p className="text-gray-900 dark:text-white text-sm leading-relaxed line-clamp-2">
                        {visit.notes}
                      </p>
                    </div>
                  )}

                  {/* Location Preview */}
                  <div
                    className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors duration-200"
                    onClick={() =>
                      handleLocationClick(visit.latitude, visit.longitude)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-blue-800 dark:text-blue-300 text-xs uppercase tracking-wide mb-2 flex items-center">
                          <Navigation className="h-3 w-3 mr-1" />
                          GPS Location
                        </p>
                        <p className="text-gray-900 dark:text-white text-sm font-mono">
                          {visit.latitude.toFixed(6)},{" "}
                          {visit.longitude.toFixed(6)}
                        </p>
                      </div>
                      <div className="flex items-center text-blue-600 dark:text-blue-400">
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                      Click to view on Google Maps
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Visit Details Modal */}
      {selectedVisit && (
        <Modal
          isOpen={!!selectedVisit}
          onClose={() => setSelectedVisit(null)}
          title="Field Visit Details"
          size="xl"
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            {/* Visit Information Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Visit Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                      Visit Purpose
                    </label>
                    <p className="text-gray-900 font-medium mt-1">
                      {selectedVisit.visitPurpose}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                      Visit Date
                    </label>
                    <p className="text-gray-900 font-medium mt-1">
                      {formatDate(selectedVisit.visitDate)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                      Check-in Time
                    </label>
                    <p className="text-gray-900 font-medium mt-1">
                      {new Date(selectedVisit.checkInTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                      GPS Coordinates
                    </label>
                    <div
                      className="text-gray-900 font-medium mt-1 font-mono text-sm cursor-pointer hover:text-blue-600 transition-colors duration-200 flex items-center group"
                      onClick={() =>
                        handleLocationClick(
                          selectedVisit.latitude,
                          selectedVisit.longitude
                        )
                      }
                    >
                      <span className="mr-2">
                        {selectedVisit.latitude.toFixed(6)},{" "}
                        {selectedVisit.longitude.toFixed(6)}
                      </span>
                      <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Click to view on Google Maps
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Person Information Card */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
              <h4 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Sales Representative
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                    Full Name
                  </label>
                  <p className="text-gray-900 font-medium mt-1">
                    {selectedVisit.sales.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                    Email Address
                  </label>
                  <p className="text-gray-900 font-medium mt-1">
                    {selectedVisit.sales.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Information Card */}
            {selectedVisit.customer && (
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-200">
                <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
                  <Store className="h-5 w-5 mr-2" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-purple-800 uppercase tracking-wide">
                      Customer Name
                    </label>
                    <p className="text-gray-900 font-medium mt-1">
                      {selectedVisit.customer.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-purple-800 uppercase tracking-wide">
                      Address
                    </label>
                    <p className="text-gray-900 font-medium mt-1">
                      📍 {selectedVisit.customer.city} -{" "}
                      {selectedVisit.customer.address}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes Section */}
            {selectedVisit.notes && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-xl border border-amber-200">
                <h4 className="text-lg font-bold text-amber-900 mb-4">
                  Visit Notes & Comments
                </h4>
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {selectedVisit.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Photos Section */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-6 rounded-xl border border-rose-200">
              <h4 className="text-lg font-bold text-rose-900 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Image className="h-5 w-5 mr-2" />
                  Field Visit Photos
                </span>
                <span className="text-sm font-normal bg-rose-200 text-rose-800 px-3 py-1 rounded-full">
                  {selectedVisit.photos.length} photo
                  {selectedVisit.photos.length !== 1 ? "s" : ""}
                </span>
              </h4>
              <div className="bg-white p-4 rounded-lg border border-rose-200">
                <p className="text-sm text-gray-600 mb-4 italic">
                  Click on any photo to view it in full size on a new page
                </p>
                <PhotoViewer photos={selectedVisit.photos} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Single Visit Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={!!showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          title="Delete Visit"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              This will permanently delete this visit and all associated photos.
              This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(showDeleteModal)}
                disabled={deleteLoading === showDeleteModal}
              >
                {deleteLoading === showDeleteModal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete All Visits Modal */}
      {showDeleteAllModal && (
        <Modal
          isOpen={showDeleteAllModal}
          onClose={() => setShowDeleteAllModal(false)}
          title="Delete All Visits"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              This will permanently delete all {visits.length} field visits and
              their photos. This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteAllModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAll}
                disabled={deleteAllLoading}
              >
                {deleteAllLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete All"
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
