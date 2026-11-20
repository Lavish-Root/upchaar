import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MedicalRecord, RecordType } from '../../types';
import { FileText, Upload, Plus, Download, Calendar, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/cn';

export const PatientRecordsPage: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    recordType: 'LAB_REPORT' as RecordType,
    fileUrl: 'https://praansewa.health/sample-records/lab-report.pdf',
    notes: '',
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/patients/medical-records');
      if (res.data) setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);
    setUploadError('');

    try {
      const res: any = await api.post('/patients/medical-records', formData);
      if (res.success) {
        setUploadModalOpen(false);
        setFormData({
          title: '',
          recordType: 'LAB_REPORT',
          fileUrl: 'https://praansewa.health/sample-records/lab-report.pdf',
          notes: '',
        });
        fetchRecords();
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to record medical document');
    } finally {
      setUploadLoading(false);
    }
  };

  const getRecordTypeBadge = (type: RecordType) => {
    switch (type) {
      case 'LAB_REPORT':
        return <Badge variant="info">Lab Report</Badge>;
      case 'SCAN':
        return <Badge variant="warning">Scan / Imaging</Badge>;
      case 'PRESCRIPTION':
        return <Badge variant="success">Prescription</Badge>;
      case 'DISCHARGE_SUMMARY':
        return <Badge variant="default">Discharge Summary</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Medical Records & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Secure repository for diagnostic reports, blood tests, and scans.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-1.5" />
          Upload New Document
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading medical documents..." />
      ) : records.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No medical records uploaded</h3>
          <p className="text-xs text-slate-500">Keep all your laboratory reports and imaging in one place for doctors to review.</p>
          <Button size="sm" variant="primary" onClick={() => setUploadModalOpen(true)}>
            Upload First Report
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getRecordTypeBadge(rec.recordType)}
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDate(rec.recordDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {rec.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {rec.notes}
                </p>
              )}

              {rec.doctor && (
                <p className="text-[11px] text-slate-500">
                  Reviewed by: <strong>{rec.doctor.user.fullName}</strong>
                </p>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[10px]">PDF Document</span>
                <a
                  href={rec.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-primary-600 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download / View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Medical Document"
        description="Add a lab report, blood test, scan, or hospital summary to your permanent record."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          <Input
            label="Document Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Complete Blood Count (CBC) or Lipid Panel"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Document Category</label>
            <select
              value={formData.recordType}
              onChange={(e) => setFormData({ ...formData, recordType: e.target.value as RecordType })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="LAB_REPORT">Laboratory / Blood Test Report</option>
              <option value="SCAN">Radiology / MRI / CT / X-Ray Scan</option>
              <option value="PRESCRIPTION">External Prescription</option>
              <option value="DISCHARGE_SUMMARY">Hospital Discharge Summary</option>
              <option value="OTHER">Other Health Record</option>
            </select>
          </div>

          <Input
            label="Document File URL (or simulated Cloudinary upload)"
            value={formData.fileUrl}
            onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
            placeholder="https://..."
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Clinical Notes or Key Findings</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Normal values, fasting blood sugar 94 mg/dL..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={uploadLoading}>
              Save Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
