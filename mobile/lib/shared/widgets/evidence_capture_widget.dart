import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';

class EvidenceCaptureWidget extends StatefulWidget {
  final List<File> initialFiles;
  final ValueChanged<List<File>> onFilesChanged;
  final int maxFiles;
  final String title;
  final String subtitle;
  final bool isUploading;
  final double? uploadProgress;
  final bool singleFileMode;

  const EvidenceCaptureWidget({
    super.key,
    required this.initialFiles,
    required this.onFilesChanged,
    this.maxFiles = 5,
    this.title = 'Photo Evidence',
    this.subtitle = 'Capture with camera or select clear photos from gallery (Max 10MB each).',
    this.isUploading = false,
    this.uploadProgress,
    this.singleFileMode = false,
  });

  @override
  State<EvidenceCaptureWidget> createState() => _EvidenceCaptureWidgetState();
}

class _EvidenceCaptureWidgetState extends State<EvidenceCaptureWidget> {
  late List<File> _files;
  final ImagePicker _picker = ImagePicker();
  String? _errorMessage;

  static const int _maxFileSizeBytes = 10 * 1024 * 1024; // 10 MB
  static const List<String> _allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  @override
  void initState() {
    super.initState();
    _files = List.from(widget.initialFiles);
  }

  @override
  void didUpdateWidget(covariant EvidenceCaptureWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialFiles != oldWidget.initialFiles) {
      _files = List.from(widget.initialFiles);
    }
  }

  bool _validateFile(File file) {
    final path = file.path.toLowerCase();
    final hasValidExt = _allowedExtensions.any((ext) => path.endsWith(ext));
    if (!hasValidExt) {
      _showError('Unsupported format. Please upload JPG, PNG, or WEBP images.');
      return false;
    }

    try {
      final size = file.lengthSync();
      if (size > _maxFileSizeBytes) {
        _showError('File exceeds 10MB limit (${(size / (1024 * 1024)).toStringAsFixed(1)}MB).');
        return false;
      }
    } catch (_) {
      // If lengthSync fails, proceed
    }
    return true;
  }

  void _showError(String message) {
    setState(() => _errorMessage = message);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    setState(() => _errorMessage = null);
    try {
      final XFile? picked = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (picked == null) return;
      final file = File(picked.path);

      if (!_validateFile(file)) return;

      setState(() {
        if (widget.singleFileMode) {
          _files = [file];
        } else {
          if (_files.length >= widget.maxFiles) {
            _showError('Maximum of ${widget.maxFiles} photos allowed.');
            return;
          }
          _files.add(file);
        }
      });
      widget.onFilesChanged(_files);
    } catch (e) {
      _showError('Could not access image: $e');
    }
  }

  Future<void> _pickMultiFromGallery() async {
    setState(() => _errorMessage = null);
    try {
      final List<XFile> pickedList = await _picker.pickMultiImage(
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (pickedList.isEmpty) return;

      final validFiles = <File>[];
      for (final xf in pickedList) {
        final f = File(xf.path);
        if (_validateFile(f)) {
          validFiles.add(f);
        }
      }

      setState(() {
        if (widget.singleFileMode && validFiles.isNotEmpty) {
          _files = [validFiles.first];
        } else {
          for (final f in validFiles) {
            if (_files.length < widget.maxFiles) {
              _files.add(f);
            }
          }
        }
      });
      widget.onFilesChanged(_files);
    } catch (e) {
      // Fallback to single picker
      await _pickImage(ImageSource.gallery);
    }
  }

  void _showSourceSelectionSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Select photo source',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primarySubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: AppColors.primary),
                ),
                title: const Text('Take Photo', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Capture using device camera'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.camera);
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primarySubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: AppColors.primary),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Select from saved device photos'),
                onTap: () {
                  Navigator.pop(ctx);
                  if (widget.singleFileMode) {
                    _pickImage(ImageSource.gallery);
                  } else {
                    _pickMultiFromGallery();
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _removeFile(int index) {
    setState(() {
      _files.removeAt(index);
    });
    widget.onFilesChanged(_files);
  }

  void _previewImage(File file) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.file(file, fit: BoxFit.contain),
            ),
            IconButton(
              icon: const CircleAvatar(
                backgroundColor: Colors.black54,
                child: Icon(Icons.close, color: Colors.white, size: 20),
              ),
              onPressed: () => Navigator.pop(ctx),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final canAddMore = _files.length < widget.maxFiles;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              widget.title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            if (!widget.singleFileMode)
              Text(
                '${_files.length}/${widget.maxFiles}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          widget.subtitle,
          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
        if (_errorMessage != null) ...[
          const SizedBox(height: 6),
          Text(
            _errorMessage!,
            style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.w500),
          ),
        ],
        const SizedBox(height: 12),
        if (widget.isUploading) ...[
          LinearProgressIndicator(
            value: widget.uploadProgress,
            backgroundColor: AppColors.primarySubtle,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Uploading evidence securely...',
            style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 12),
        ],
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            ..._files.asMap().entries.map((entry) {
              final idx = entry.key;
              final file = entry.value;
              return Stack(
                children: [
                  GestureDetector(
                    onTap: () => _previewImage(file),
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border, width: 1.5),
                        color: AppColors.surfaceVariant,
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(
                          file,
                          width: 96,
                          height: 96,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: InkWell(
                      onTap: () => _removeFile(idx),
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
                  Positioned(
                    bottom: 4,
                    left: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.zoom_in, size: 10, color: Colors.white),
                          SizedBox(width: 2),
                          Text('View', style: TextStyle(color: Colors.white, fontSize: 9)),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            }),
            if (canAddMore)
              InkWell(
                onTap: widget.isUploading ? null : _showSourceSelectionSheet,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    color: AppColors.primarySubtle,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primaryLight,
                      width: 1.5,
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(
                          color: AppColors.primaryLight,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.add_a_photo_rounded,
                          size: 20,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        widget.singleFileMode ? 'Choose' : '+ Add Photo',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
