namespace AssetBridge.Application.Common.Models;

// Provides a standardized pagination envelope for listing queries.
// Ensures that frontends (React table views & Flutter infinite scrolls)
// receive uniform pagination metadata (PageNumber, PageSize, TotalCount, TotalPages).
public class PagedResponse<T>
{
    public IReadOnlyList<T> Items { get; set; } = new List<T>();
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    public PagedResponse()
    {
    }

    public PagedResponse(IReadOnlyList<T> items, int count, int pageNumber, int pageSize)
    {
        Items = items;
        TotalCount = count;
        PageNumber = pageNumber;
        PageSize = pageSize;
    }
}
