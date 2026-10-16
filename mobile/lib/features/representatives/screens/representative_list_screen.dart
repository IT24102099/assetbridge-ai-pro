import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/feedback_states.dart';
import '../../../shared/widgets/status_badge.dart';
import '../models/representative_model.dart';
import '../services/representative_service.dart';
import 'representative_document_screen.dart';

class RepresentativeListScreen extends StatefulWidget {
  const RepresentativeListScreen({super.key});

  @override
  State<RepresentativeListScreen> createState() => _RepresentativeListScreenState();
}

class _RepresentativeListScreenState extends State<RepresentativeListScreen> {
  final RepresentativeService _service = RepresentativeService();
  final TextEditingController _searchController = TextEditingController();

  List<RepresentativeModel> _representatives = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadRepresentatives();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadRepresentatives() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final statusParam = _selectedFilter == 'All'
          ? null
          : (_selectedFilter == 'Verified' ? 'Verified' : 'PendingReview');
      final result = await _service.getRepresentatives(
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        verificationStatus: statusParam,
      );

      setState(() {
        _representatives = result.items;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  void _onFilterSelected(String filter) {
    if (_selectedFilter != filter) {
      setState(() => _selectedFilter = filter);
      _loadRepresentatives();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Local Representatives'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadRepresentatives,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter header
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            color: AppColors.surface,
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by representative name or district...',
                    prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _loadRepresentatives();
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  onSubmitted: (_) => _loadRepresentatives(),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All'),
                      const SizedBox(width: 8),
                      _buildFilterChip('Verified'),
                      const SizedBox(width: 8),
                      _buildFilterChip('PendingReview', label: 'Pending Review'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Content body
          Expanded(
            child: _buildBody(),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filter, {String? label}) {
    final isSelected = _selectedFilter == filter;
    return ChoiceChip(
      label: Text(label ?? filter),
      selected: isSelected,
      onSelected: (_) => _onFilterSelected(filter),
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.surfaceVariant,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.textSecondary,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
        fontSize: 12,
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return ErrorState(
        message: _errorMessage!,
        onRetry: _loadRepresentatives,
      );
    }

    if (_representatives.isEmpty) {
      return EmptyState(
        title: 'No Representatives Found',
        message: _searchController.text.isNotEmpty
            ? 'No representatives matching "${_searchController.text}".'
            : 'No representative profiles are currently available.',
        icon: Icons.person_search_rounded,
        onAction: _loadRepresentatives,
        actionLabel: 'Refresh Directory',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadRepresentatives,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _representatives.length,
        itemBuilder: (context, index) {
          final rep = _representatives[index];
          return _buildRepresentativeCard(rep);
        },
      ),
    );
  }

  Widget _buildRepresentativeCard(RepresentativeModel rep) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          final changed = await Navigator.push<bool>(
            context,
            MaterialPageRoute(
              builder: (ctx) => RepresentativeDocumentScreen(representative: rep),
            ),
          );
          if (changed == true) {
            _loadRepresentatives();
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: rep.isVerified ? AppColors.successSubtle : AppColors.primarySubtle,
                    child: Text(
                      rep.fullName.isNotEmpty ? rep.fullName[0].toUpperCase() : 'R',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: rep.isVerified ? AppColors.success : AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          rep.fullName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '${rep.city}, ${rep.district}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  StatusBadge(status: rep.verificationStatus),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(Icons.badge_outlined, size: 14, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text(
                          rep.nationalIdNumber != null && rep.nationalIdNumber!.isNotEmpty
                              ? 'NIC: ${rep.nationalIdNumber}'
                              : 'NIC: Pending Upload',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: rep.nationalIdNumber != null
                                ? AppColors.textPrimary
                                : AppColors.warning,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                ],
              ),
              if (rep.phoneNumber.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.phone_outlined, size: 13, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      rep.phoneNumber,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
