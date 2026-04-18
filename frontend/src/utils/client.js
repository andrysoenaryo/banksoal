import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

export function buildClient(token) {
    return axios.create({
        baseURL: API_BASE_URL,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
}
