import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // Submit p95 latency budget < 800ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';

export default function () {
  const payload = JSON.stringify({
    title: `Pothole complaint ${Date.now()}`,
    description: "Deep dangerous road damage near intersection causing vehicle skids",
    phone: "9876543210",
    email: `citizen_${__VU}@test.gov`,
    category: "roads",
    lat: 16.5062 + (Math.random() - 0.5) * 0.05,
    lng: 80.6480 + (Math.random() - 0.5) * 0.05
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/issues`, payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'has complaintId': (r) => JSON.parse(r.body).complaintId !== undefined,
  });

  sleep(1);
}
