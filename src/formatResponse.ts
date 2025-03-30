export default function formatResponse(
  status: number,
  data: Object | null,
  error: string | null = null
) {
  if (error) {
    return {
      status,
      error,
      data
    };
  } else {
    return {
      status,
      data
    };
  }
}
