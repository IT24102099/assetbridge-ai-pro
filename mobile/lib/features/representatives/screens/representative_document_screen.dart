import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/evidence_capture_widget.dart';
import '../../../shared/widgets/feedback_states.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/representative_document_model.dart';
import '../models/representative_model.dart';
import '../services/representative_service.dart';

class RepresentativeDocumentScreen extends StatefulWidget {
  final RepresentativeModel representative;

  const RepresentativeDocumentScreen({
    super.key,
    required this.representative,
  });

  @override
  State<RepresentativeDocumentScreen> createState() =>
      _RepresentativeDocumentScreenState();
}

class _RepresentativeDocumentScreenState extends State<RepresentativeDocumentScreen> {
  final RepresentativeService _service = RepresentativeService();

  late RepresentativeModel _representative;
  List<RepresentativeDocumentModel> _documents = [];
  bool _isLoadingDocs = true;
  String? _errorMessage;

  // Upload Form State
  final _uploadFormKey = GlobalKey<FormState>();
  String _selectedDocType = 'NationalId';
  final TextEditingController _notesController = TextEditingController();
  final List<File> _selectedFiles = [];
  bool _isUploading = false;

  final Map<String, String> _docTypes = {
    'NationalId': 'National Identity Card (NIC)',
    'ProofOfAddress': 'Proof of Address (Utility Bill)',
    'PoliceReport': 'Police Clearance Certificate',
    'Other': 'Other Supporting Document',
  };

  @override
  void initState() {
    super.initState();
    _representative = widget.representative;
    _loadDocuments();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadDocuments() async {
    setState(() {
      _isLoadingDocs = true;
      _errorMessage = null;
    });

    try {
      final docs = await _service.getVerificationDocuments(_representative.id);
      // Also refresh rep details
      final updatedRep = await _service.getRepresentativeById(_representative.id);
      setState(() {
        _documents = docs;
        _representative = updatedRep;
        _isLoadingDocs = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoadingDocs = false;
      });
    }
  }

  Future<void> _handleUpload() async {
    if (_selectedFiles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an NIC / document photo to upload.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isUploading = true);

    try {
      await _service.uploadVerificationDocument(
        representativeId: _representative.id,
        file: _selectedFiles.first,
        documentType: _selectedDocType,
        notes: _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : null,
      );

      setState(() {
        _selectedFiles.clear();
        _notesController.clear();
        _isUploading = false;
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Verification document submitted successfully.'),
          backgroundColor: AppColors.success,
        ),
      );

      _loadDocuments();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isUploading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Upload failed: ${e.toString().replaceAll('Exception: ', '')}'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showReviewModal(RepresentativeDocumentModel doc) {
    String decision = 'Verified';
    final notesController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Review Document Verification',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Reviewing: ${doc.documentTypeName} (${doc.fileName})',
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Verification Decision *',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(
                        label: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.check_circle_outline, size: 16, color: Colors.white),
                            SizedBox(width: 6),
                            Text('Verify / Approve'),
                          ],
                        ),
                        selected: decision == 'Verified',
                        selectedColor: AppColors.success,
                        onSelected: (val) {
                          if (val) setModalState(() => decision = 'Verified');
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ChoiceChip(
                        label: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.cancel_outlined, size: 16, color: Colors.white),
                            SizedBox(width: 6),
                            Text('Reject'),
                          ],
                        ),
                        selected: decision == 'Rejected',
                        selectedColor: AppColors.error,
                        onSelected: (val) {
                          if (val) setModalState(() => decision = 'Rejected');
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'Reviewer Notes',
                  hint: 'State reason for approval or rejection...',
                  controller: notesController,
                  maxLines: 3,
                ),
                const SizedBox(height: 20),
                AppButton(
                  text: 'Submit Decision',
                  isLoading: isSubmitting,
                  onPressed: () async {
                    setModalState(() => isSubmitting = true);
                    try {
                      await _service.reviewVerificationDocument(
                        representativeId: _representative.id,
                        documentId: doc.id,
                        status: decision,
                        notes: notesController.text.trim().isNotEmpty
                            ? notesController.text.trim()
                            : null,
                      );
                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadDocuments();
                    } catch (e) {
                      setModalState(() => isSubmitting = false);
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(
                            content: Text(e.toString().replaceAll('Exception: ', '')),
                            backgroundColor: AppColors.error,
                          ),
                        );
                      }
                    }
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showUpdateRepresentativeVerificationModal() {
    String decision = _representative.isVerified ? 'Verified' : 'PendingReview';
    final notesController = TextEditingController(text: _representative.verificationNotes ?? '');
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Representative Verification Status',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: decision,
                  decoration: const InputDecoration(labelText: 'Overall Status'),
                  items: const [
                    DropdownMenuItem(value: 'Verified', child: Text('Verified Representative')),
                    DropdownMenuItem(value: 'PendingReview', child: Text('Pending Review')),
                    DropdownMenuItem(value: 'Rejected', child: Text('Rejected / Suspended')),
                  ],
                  onChanged: (val) {
                    if (val != null) setModalState(() => decision = val);
                  },
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: 'Audit Notes',
                  hint: 'Optional verification comments...',
                  controller: notesController,
                  maxLines: 2,
                ),
                const SizedBox(height: 20),
                AppButton(
                  text: 'Save Verification Status',
                  isLoading: isSubmitting,
                  onPressed: () async {
                    setModalState(() => isSubmitting = true);
                    try {
                      await _service.updateVerificationStatus(
                        representativeId: _representative.id,
                        status: decision,
                        notes: notesController.text.trim().isNotEmpty
                            ? notesController.text.trim()
                            : null,
                      );
                      if (ctx.mounted) Navigator.pop(ctx);
                      _loadDocuments();
                    } catch (e) {
                      setModalState(() => isSubmitting = false);
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(
                            content: Text(e.toString().replaceAll('Exception: ', '')),
                            backgroundColor: AppColors.error,
                          ),
                        );
                      }
                    }
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isManagerOrAdmin = auth.user?.isManagerOrAdmin ?? false;
    final isSelf = auth.user != null &&
        (_representative.userId == auth.user!.id ||
            _representative.email.toLowerCase() == auth.user!.email.toLowerCase());
    final canUpload = isManagerOrAdmin || isSelf;

    return Scaffold(
      appBar: AppBar(
        title: const Text('NIC & Document Verification'),
        actions: [
          if (isManagerOrAdmin)
            IconButton(
              icon: const Icon(Icons.verified_user_rounded),
              tooltip: 'Update Representative Verification',
              onPressed: _showUpdateRepresentativeVerificationModal,
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadDocuments,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDocuments,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Profile Header Card
              _buildProfileHeaderCard(),
              const SizedBox(height: 20),

              // Upload Form Section (for Rep or Manager)
              if (canUpload) ...[
                _buildUploadSection(),
                const SizedBox(height: 24),
              ],

              // Uploaded Documents List
              _buildDocumentsList(isManagerOrAdmin),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileHeaderCard() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: _representative.isVerified
                      ? AppColors.successSubtle
                      : AppColors.primarySubtle,
                  child: Text(
                    _representative.fullName.isNotEmpty
                        ? _representative.fullName[0].toUpperCase()
                        : 'R',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: _representative.isVerified
                          ? AppColors.success
                          : AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _representative.fullName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined,
                              size: 14, color: AppColors.textMuted),
                          const SizedBox(width: 4),
                          Text(
                            '${_representative.city}, ${_representative.district}',
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                StatusBadge(status: _representative.verificationStatus),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'National ID (NIC)',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _representative.nationalIdNumber != null &&
                                _representative.nationalIdNumber!.isNotEmpty
                            ? _representative.nationalIdNumber!
                            : 'Pending submission',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _representative.nationalIdNumber != null
                              ? AppColors.textPrimary
                              : AppColors.warning,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Phone Contact',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _representative.phoneNumber.isNotEmpty
                            ? _representative.phoneNumber
                            : 'Not provided',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (_representative.verificationNotes != null &&
                _representative.verificationNotes!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Notes: ${_representative.verificationNotes!}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildUploadSection() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _uploadFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primarySubtle,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.upload_file_rounded,
                        color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Upload Verification Document',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Document Type Selection
              const Text(
                'Document Type *',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedDocType,
                isExpanded: true,
                items: _docTypes.entries.map((e) {
                  return DropdownMenuItem(
                    value: e.key,
                    child: Text(e.value, overflow: TextOverflow.ellipsis),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedDocType = val);
                },
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 16),

              // Reusable Camera & Gallery Capture
              EvidenceCaptureWidget(
                initialFiles: _selectedFiles,
                singleFileMode: true,
                maxFiles: 1,
                title: 'Capture or Select Document Photo',
                subtitle:
                    'Take a clear, well-lit photo of your Sri Lankan NIC (front/back) or select from gallery. Max 10MB.',
                onFilesChanged: (files) {
                  setState(() {
                    _selectedFiles.clear();
                    _selectedFiles.addAll(files);
                  });
                },
                isUploading: _isUploading,
              ),
              const SizedBox(height: 14),

              AppTextField(
                label: 'Notes / Remarks (Optional)',
                hint: 'e.g., Front side of new format smart NIC',
                controller: _notesController,
              ),
              const SizedBox(height: 16),

              AppButton(
                text: 'Upload Document for Verification',
                icon: Icons.cloud_upload_rounded,
                isLoading: _isUploading,
                onPressed: _handleUpload,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentsList(bool isManagerOrAdmin) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Verification Documents',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              '${_documents.length} item(s)',
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_isLoadingDocs)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24.0),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_errorMessage != null)
          ErrorState(
            message: _errorMessage!,
            onRetry: _loadDocuments,
          )
        else if (_documents.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: const Center(
              child: Column(
                children: [
                  Icon(Icons.description_outlined, size: 40, color: AppColors.textMuted),
                  SizedBox(height: 8),
                  Text(
                    'No verification documents uploaded yet.',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Upload your NIC image above to complete identity verification.',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _documents.length,
            itemBuilder: (context, index) {
              final doc = _documents[index];
              return _buildDocumentCard(doc, isManagerOrAdmin);
            },
          ),
      ],
    );
  }

  Widget _buildDocumentCard(RepresentativeDocumentModel doc, bool isManagerOrAdmin) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primarySubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.badge_rounded, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        doc.documentTypeName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        doc.fileName,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Size: ${doc.formattedFileSize} • Uploaded: ${_formatDate(doc.uploadedAtUtc)}',
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status: doc.status),
              ],
            ),
            if (doc.reviewerNotes != null && doc.reviewerNotes!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Reviewer Notes: ${doc.reviewerNotes!}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ),
            ],
            if (isManagerOrAdmin) ...[
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    icon: const Icon(Icons.rate_review_outlined, size: 16),
                    label: const Text('Review Document'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    onPressed: () => _showReviewModal(doc),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }
}
