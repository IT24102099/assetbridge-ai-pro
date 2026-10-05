import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
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
  final ImagePicker _imagePicker = ImagePicker();

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

  Future<void> _pickPhotos() async {
    try {
      final List<XFile> picked = await _imagePicker.pickMultiImage();
      if (picked.isNotEmpty) {
        setState(() {
          _selectedPhotos.addAll(picked.map((x) => File(x.path)));
        });
      }
    } catch (e) {
      // Fallback to single image pick if multi-image picker is not supported on this platform/device
      try {
        final XFile? singlePicked = await _imagePicker.pickImage(source: ImageSource.gallery);
        if (singlePicked != null) {
          setState(() {
            _selectedPhotos.add(File(singlePicked.path));
          });
        }
      } catch (err) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open gallery: $err'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _removePhoto(int index) {
    setState(() {
      _selectedPhotos.removeAt(index);
    });
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
                    const Text(
                      'Defect Photo Evidence',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Attach clear photos of the defect to assist AI analysis & contractor quoting.',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 10),

                    // Evidence Preview Grid
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        ..._selectedPhotos.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final file = entry.value;
                          return Stack(
                            children: [
                              Container(
                                width: 88,
                                height: 88,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.file(
                                    file,
                                    width: 88,
                                    height: 88,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 4,
                                right: 4,
                                child: InkWell(
                                  onTap: () => _removePhoto(idx),
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: Colors.black54,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.close, size: 14, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          );
                        }),
                        InkWell(
                          onTap: _pickPhotos,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 88,
                            height: 88,
                            decoration: BoxDecoration(
                              color: AppColors.primarySubtle,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.primaryLight),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add_a_photo_outlined, size: 24, color: AppColors.primary),
                                SizedBox(height: 4),
                                Text(
                                  '+ Add Photo',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
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
