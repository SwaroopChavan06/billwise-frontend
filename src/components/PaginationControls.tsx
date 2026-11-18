import type { ChangeEvent } from 'react'

export type PaginationInfo = {
  currentPage: number
  pageSize: number
  totalRecords: number
  totalPages: number
}

const pageSizes = [10, 20, 50, 100, 200, 500, 1000]

export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: {
  pagination: PaginationInfo
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
}) {
  function changePageSize(event: ChangeEvent<HTMLSelectElement>) {
    onPageSizeChange(Number(event.target.value))
  }

  const { currentPage, pageSize, totalRecords, totalPages } = pagination
  return <div className="pagination-controls" aria-label="Table pagination">
    <span className="pagination-count">{totalRecords.toLocaleString()} records</span>
    <label className="pagination-size">Rows per page
      <select value={pageSize} onChange={changePageSize} disabled={disabled}>
        {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
    <span className="pagination-page">Page {currentPage} of {totalPages}</span>
    <div className="pagination-buttons">
      <button type="button" className="secondary-button" onClick={() => onPageChange(currentPage - 1)} disabled={disabled || currentPage <= 1}>Previous</button>
      <button type="button" className="secondary-button" onClick={() => onPageChange(currentPage + 1)} disabled={disabled || totalPages === 0 || currentPage >= totalPages}>Next</button>
    </div>
  </div>
}
