import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 30 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // Map viewport p95 latency budget < 300ms
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';

export default function () {
  const minLng = 80.60 + Math.random() * 0.05;
  const minLat = 16.48 + Math.random() * 0.05;
  const maxLng = minLng + 0.05;
  const maxLat = minLat + 0.05;

  const url = `${BASE_URL}/api/v1/map/issues?bbox=${minLng.toFixed(4)},${minLat.toFixed(4)},${maxLng.toFixed(4)},${maxLat.toFixed(4)}&status=All&category=All`;

  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has issues array': (r) => Array.isArray(JSON.parse(r.body).issues),
    'response under 60KB': (r) => r.body.length < 60000,
  });

  sleep(0.5);
}
