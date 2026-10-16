import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/evidence_capture_widget.dart';
import '../../assets/models/asset_model.dart';
import '../../assets/services/asset_service.dart';
import '../models/incident_model.dart';
import '../services/incident_service.dart';

class ReportIncidentScreen extends StatefulWidget {
  const ReportIncidentScreen({super.key});

  @override
  State<ReportIncidentScreen> createState() => _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends State<ReportIncidentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _budgetController = TextEditingController();
  final _locationController = TextEditingController();

  final AssetService _assetService = AssetService();
  final IncidentService _incidentService = IncidentService();

  List<AssetModel> _assets = [];
  String? _selectedAssetId;
  String _selectedCategory = 'Plumbing';
  String _selectedPriority = 'Medium';

  bool _isLoadingAssets = true;
  bool _isSubmitting = false;

  // Real user-selected photo evidence files
  final List<File> _selectedPhotos = [];

  final List<String> _categories = [
    'Plumbing',
    'Electrical',
    'Roofing',
    'Structural',
    'HVAC',
    'Painting',
    'General'
  ];

  final List<String> _priorities = ['Low', 'Medium', 'High', 'Emergency'];

  @override
  void initState() {
    super.initState();
    _loadAssets();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _budgetController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _loadAssets() async {
    try {
      final res = await _assetService.getAssets(pageSize: 50);
      setState(() {
        _assets = res.items;
        if (_assets.isNotEmpty) {
          _selectedAssetId = _assets.first.id;
        }
        _isLoadingAssets = false;
      });
    } catch (_) {
      setState(() => _isLoadingAssets = false);
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedAssetId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a target property.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final budget = double.tryParse(_budgetController.text.trim());
      final req = CreateIncidentRequest(
        assetId: _selectedAssetId!,
        title: _titleController.text.trim(),
        description: _descController.text.trim(),
        category: _selectedCategory,
        priority: _selectedPriority,
        estimatedBudget: budget,
        locationDetails: _locationController.text.trim(),
      );

      final created = await _incidentService.createIncident(req);

      // Upload actual selected photo files if any
      for (final photoFile in _selectedPhotos) {
        try {
          await _incidentService.uploadEvidenceFile(
            created.id,
            photoFile,
            caption: 'Mobile defect evidence capture',
          );
        } catch (uploadErr) {
          debugPrint('Notice: evidence file upload error: $uploadErr');
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Incident reported successfully. AI workflow initiated.'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Property Defect'),
      ),
      body: _isLoadingAssets
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Property Selection
                    const Text(
                      'Target Property *',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      isExpanded: true,
                      value: _selectedAssetId,
                      items: _assets.map((a) {
                        return DropdownMenuItem(
                          value: a.id,
                          child: Text(
                            '${a.name} (${a.city})',
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedAssetId = val),
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Title
                    AppTextField(
                      label: 'Incident Title *',
                      hint: 'e.g. Master Bedroom Ceiling Leak',
                      controller: _titleController,
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Title is required';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Category & Priority
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Category *',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              DropdownButtonFormField<String>(
                                isExpanded: true,
                                value: _selectedCategory,
                                items: _categories
                                    .map((c) => DropdownMenuItem(
                                          value: c,
                                          child: Text(c, overflow: TextOverflow.ellipsis),
                                        ))
                                    .toList(),
                                onChanged: (val) => setState(() => _selectedCategory = val!),
                                decoration: const InputDecoration(
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Priority *',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              DropdownButtonFormField<String>(
                                isExpanded: true,
                                value: _selectedPriority,
                                items: _priorities
                                    .map((p) => DropdownMenuItem(
                                          value: p,
                                          child: Text(p, overflow: TextOverflow.ellipsis),
                                        ))
                                    .toList(),
                                onChanged: (val) => setState(() => _selectedPriority = val!),
                                decoration: const InputDecoration(
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Description
                    AppTextField(
                      label: 'Detailed Description *',
                      hint: 'Describe the defect, severity, and when it occurred...',
                      controller: _descController,
                      maxLines: 4,
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Description is required';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Estimated Budget & Location
                    Row(
                      children: [
                        Expanded(
                          child: AppTextField(
                            label: 'Approved Budget (LKR)',
                            hint: 'e.g. 50000',
                            controller: _budgetController,
                            keyboardType: TextInputType.number,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: AppTextField(
                            label: 'Room / Exact Location',
                            hint: 'e.g. 2nd Floor Roof',
                            controller: _locationController,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Photo Evidence Upload Section
                    EvidenceCaptureWidget(
                      initialFiles: _selectedPhotos,
                      onFilesChanged: (files) {
                        setState(() {
                          _selectedPhotos.clear();
                          _selectedPhotos.addAll(files);
                        });
                      },
                      title: 'Defect Photo Evidence',
                      subtitle: 'Capture camera photo or select from gallery to assist AI analysis & contractor quoting.',
                      isUploading: _isSubmitting && _selectedPhotos.isNotEmpty,
                    ),
                    const SizedBox(height: 32),

                    // Submit Button
                    AppButton(
                      text: 'Submit Incident & Start Workflow',
                      icon: Icons.send_rounded,
                      isLoading: _isSubmitting,
                      onPressed: _handleSubmit,
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
