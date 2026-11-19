import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Doctor, VerificationStatus } from '../../types';
import {
  UserCheck,
  ShieldCheck,
  XCircle,
  FileText,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Mail,
  Phone,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/cn';

export const AdminDoctorsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Verification modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  const copyToClipboard = (text: string, isRowId?: string) => {
    navigator.clipboard.writeText(text);
    if (isRowId) {
      setCopiedRowId(isRowId);
      setTimeout(() => setCopiedRowId(null), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedStatus]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchTerm) params.search = searchTerm;

      const res: any = await api.get('/admin/doctors', { params });
      if (res.data) setDoctors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  const handleVerificationDecision = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedDoctor) return;
    setVerifying(true);
    try {
      await api.patch(`/admin/doctors/${selectedDoctor.id}/verification`, {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
      });
      setReviewModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Verification update failed.');
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Verification Pending</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Doctor Credential Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit State Medical Council registration licenses and approve doctors before they can accept appointments.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input
          type="text"
          placeholder="Search by name, email, or registration number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <Button type="submit" variant="primary" size="sm">
          Search
        </Button>
      </form>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Fetching doctor credential applications..." />
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-2">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No doctor records matching this criteria</h3>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Doctor Details</th>
                  <th className="p-4">Specialty</th>
                  <th className="p-4">Registration No</th>
                  <th className="p-4">Experience</th>
                  <th className="p-4">Fee</th>
                  <th className="p-4">Verification Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                          Dr
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-extrabold text-slate-900 leading-tight">{doc.user.fullName}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                              href={`mailto:${doc.user.email}`}
                              className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-1"
                              title="Send email"
                            >
                              <Mail className="w-3 h-3 text-primary-500 shrink-0" />
                              <span className="truncate">{doc.user.email}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(doc.user.email, doc.id)}
                              title="Copy email to clipboard"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            >
                              {copiedRowId === doc.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {doc.user.phone && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span>{doc.user.phone}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-primary-700">
                      {doc.specialties?.[0]?.specialty?.name || 'General'}
                    </td>
                    <td className="p-4 font-mono text-slate-700 font-bold">{doc.registrationNumber}</td>
                    <td className="p-4 text-slate-600">{doc.experienceYears} Years</td>
                    <td className="p-4 font-bold text-slate-900">₹{doc.consultationFee}</td>
                    <td className="p-4">{getStatusBadge(doc.verificationStatus)}</td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant={doc.verificationStatus === 'PENDING' ? 'primary' : 'outline'}
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setRejectionReason(doc.rejectionReason || '');
                          setReviewModalOpen(true);
                        }}
                      >
                        {doc.verificationStatus === 'PENDING' ? 'Review & Verify' : 'View Details'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review & Verification Decision Modal */}
      {selectedDoctor && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Review Credentials: ${selectedDoctor.user?.fullName}`}
          description={`Registered on ${formatDate(selectedDoctor.createdAt)}`}
          maxWidth="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
            {/* Top Doctor Contact Card */}
            <div className="p-3.5 bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-primary-500/20">
                  Dr
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-slate-900 text-sm truncate">
                    {selectedDoctor.user?.fullName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600 mt-0.5">
                    <a
                      href={`mailto:${selectedDoctor.user?.email}`}
                      className="text-primary-700 hover:text-primary-900 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Mail className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                      <span>{selectedDoctor.user?.email}</span>
                    </a>
                    {selectedDoctor.user?.phone && (
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{selectedDoctor.user?.phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(selectedDoctor.user?.email || '')}
                className="px-3 py-1.5 rounded-xl bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs shrink-0 transition"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmail ? 'Copied!' : 'Copy Email'}</span>
              </button>
            </div>

            {/* Credential Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Mail className="w-3 h-3 text-primary-500" />
                  Doctor Email
                </span>
                <a
                  href={`mailto:${selectedDoctor.user?.email}`}
                  className="font-bold text-primary-700 hover:underline break-all block text-xs"
                >
                  {selectedDoctor.user?.email}
                </a>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Phone className="w-3 h-3 text-teal-500" />
                  Contact Phone
                </span>
                <span className="font-semibold text-slate-800 text-xs">
                  {selectedDoctor.user?.phone || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Status</span>
                {getStatusBadge(selectedDoctor.verificationStatus)}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Medical Council Reg. No.</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{selectedDoctor.registrationNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Qualifications</span>
                <span className="font-semibold text-slate-800 text-xs">{selectedDoctor.qualifications}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Clinic Location</span>
                <span className="text-slate-700 text-xs truncate block">{selectedDoctor.clinicAddress}</span>
              </div>
            </div>

            {/* Document verification link */}
            <div>
              <span className="font-bold text-slate-700 block mb-1">Uploaded Credential Documents:</span>
              {selectedDoctor.documents?.length > 0 ? (
                <div className="space-y-2">
                  {selectedDoctor.documents.map((d: any) => (
                    <div key={d.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{d.documentType}</span>
                      <a
                        href={d.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 font-bold flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Inspect Document
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No document links uploaded.</p>
              )}
            </div>

            {/* Rejection reason box if rejecting */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rejection Reason (if declining application):</label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State the regulatory grounds or missing certificate requirements..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            {/* Decision Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleVerificationDecision('REJECTED')}
                isLoading={verifying}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject Application
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleVerificationDecision('APPROVED')}
                isLoading={verifying}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve & Authorize Practice
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
