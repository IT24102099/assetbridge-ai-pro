import 'package:flutter/material.dart';
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

  List<AssetModel> _assets = [];
  String? _selectedAssetId;
  String _selectedCategory = 'Plumbing';
  String _selectedPriority = 'Medium';

  bool _isLoadingAssets = true;
  bool _isSubmitting = false;

  // Selected photo evidence mocks/previews
  final List<String> _attachedPhotoNames = [];

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

  void _addSamplePhoto() {
    setState(() {
      _attachedPhotoNames.add('defect_photo_${_attachedPhotoNames.length + 1}.jpg');
    });
  }

  void _removePhoto(int index) {
    setState(() {
      _attachedPhotoNames.removeAt(index);
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

      // Attach any selected photo evidence
      for (final photoName in _attachedPhotoNames) {
        await _incidentService.addEvidence(
          created.id,
          'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
          photoName,
          'Mobile initial evidence capture',
        );
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
                      value: _selectedAssetId,
                      items: _assets.map((a) {
                        return DropdownMenuItem(
                          value: a.id,
                          child: Text('${a.name} (${a.city})'),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedAssetId = val),
                      decoration: const InputDecoration(),
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
                                value: _selectedCategory,
                                items: _categories
                                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                                    .toList(),
                                onChanged: (val) => setState(() => _selectedCategory = val!),
                                decoration: const InputDecoration(),
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
                                value: _selectedPriority,
                                items: _priorities
                                    .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                                    .toList(),
                                onChanged: (val) => setState(() => _selectedPriority = val!),
                                decoration: const InputDecoration(),
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

                    // Evidence Preview Row
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ..._attachedPhotoNames.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final name = entry.value;
                          return Container(
                            width: 100,
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              children: [
                                const Icon(Icons.image, size: 32, color: AppColors.primary),
                                const SizedBox(height: 4),
                                Text(
                                  name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                                ),
                                const SizedBox(height: 4),
                                InkWell(
                                  onTap: () => _removePhoto(idx),
                                  child: const Text(
                                    'Remove',
                                    style: TextStyle(fontSize: 10, color: AppColors.error, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        InkWell(
                          onTap: _addSamplePhoto,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 100,
                            height: 85,
                            decoration: BoxDecoration(
                              color: AppColors.primarySubtle,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.primaryLight, style: BorderStyle.solid),
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
