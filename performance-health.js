import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const res = http.get('https://assetbridge-api-3v3z.onrender.com/health');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'health response successful': (r) => r.json('success') === true,
  });
}
