/**
 * Map Controller — High-Performance Geospatial Bounding-Box & Clustering Endpoint
 * Target Latency: p95 < 300 ms, payload < 60 KB for 500 markers.
 */

const Issue = require('../models/issues');
const { asyncHandler } = require('../utils/asyncHandler');
const { getCached, setCached, CACHE_TTLS } = require('../lib/cache');

const getMapIssues = asyncHandler(async (req, res) => {
  const {
    bbox,       // 'minLng,minLat,maxLng,maxLat'
    status,     // Comma-separated or 'All'
    category,   // Comma-separated or 'All'
    since,      // ISO Date string
    near,       // 'lat,lng,radius_m'
    limit = 500
  } = req.query;

  const maxMarkers = Math.min(parseInt(limit) || 500, 500);
  const currentUserEmail = req.user?.email || req.query.userEmail;

  // 1. Check Cache for this viewport query
  const cacheKey = `map:bbox:${bbox || 'all'}:st:${status || 'all'}:cat:${category || 'all'}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    // Return cached lean markers
    return res.json(cached);
  }

  // 2. Build MongoDB Query
  const query = {
    isPrivate: false,
    status: { $ne: 'Spam' } // Exclude spam from public view
  };

  // Status Filter (includes 'Rejected' by default)
  if (status && status !== 'All') {
    const statuses = status.split(',').map(s => s.trim());
    query.status = { $in: statuses };
  }

  // Category Filter
  if (category && category !== 'All') {
    const categories = category.split(',').map(c => c.trim());
    query.category = { $in: categories };
  }

  // Date Filter
  if (since) {
    query.createdAt = { $gte: new Date(since) };
  }

  // Geospatial Bounding Box ($box or coordinate range)
  if (bbox) {
    const parts = bbox.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      
      // Support both GeoJSON 2dsphere and lat/lng properties
      query.$or = [
        {
          "coordinates.lat": { $gte: minLat, $lte: maxLat },
          "coordinates.lng": { $gte: minLng, $lte: maxLng }
        },
        {
          geo: {
            $geoWithin: {
              $box: [
                [minLng, minLat],
                [maxLng, maxLat]
              ]
            }
          }
        }
      ];
    }
  }

  // 3. Execute Lean Projection
  const issues = await Issue.find(query)
    .sort({ createdAt: -1 })
    .limit(maxMarkers)
    .select('_id complaintId title coordinates category status priority createdAt fileUrl clusterId closeReason email')
    .lean();

  // 4. Transform into lightweight map marker payload
  const markers = issues.map(iss => {
    const lat = iss.coordinates?.lat;
    const lng = iss.coordinates?.lng;
    const isMine = !!(currentUserEmail && iss.email && iss.email.toLowerCase() === currentUserEmail.toLowerCase());

    return {
      id: iss._id,
      complaintId: iss.complaintId,
      title: iss.title,
      lat,
      lng,
      status: iss.status,
      category: iss.category,
      priority: iss.priority,
      createdAt: iss.createdAt,
      hasImage: !!iss.fileUrl,
      isMine,
      clusterId: iss.clusterId || null,
      closeReason: iss.closeReason || null
    };
  }).filter(m => m.lat != null && m.lng != null && !isNaN(m.lat) && !isNaN(m.lng));

  const result = {
    issues: markers,
    count: markers.length,
    cachedAt: new Date().toISOString()
  };

  // 5. Store in cache (30s TTL stale-while-revalidate)
  await setCached(cacheKey, result, CACHE_TTLS.MAP_VIEWPORT);

  return res.json(result);
});

module.exports = {
  getMapIssues
};
