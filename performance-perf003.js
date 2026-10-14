import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.get('https://assetbridge-web.onrender.com/');

  check(res, {
    'page returns 200': (r) => r.status === 200,
    'page contains HTML': (r) => r.body.includes('<html') || r.body.includes('<!doctype'),
  });
}
