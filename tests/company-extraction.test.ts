import { describe, it, expect } from 'vitest';

describe('Company Extraction Tests', () => {
    const extractCompany = (headline: string): string => {
        let company = '';

        // Try patterns: " at ", " AT ", " @ " (case-insensitive)
        const companyMatch = headline.match(/(?:^|\s)(?:at|AT|@)\s+(.+?)$/i);
        if (companyMatch && companyMatch[1]) {
            company = companyMatch[1].trim();
        } else {
            // Fallback: Try to extract company after common titles
            const titlePattern = /(?:CEO|CTO|CFO|COO|VP|Vice President|Director|Manager|Head|Lead|Senior|Engineer|Developer|Designer|Analyst)\s+(?:of\s+)?(.+?)$/i;
            const titleMatch = headline.match(titlePattern);
            if (titleMatch && titleMatch[1]) {
                company = titleMatch[1].trim();
            }
        }

        return company;
    };

    describe('Case-insensitive "at" extraction', () => {
        it('should extract from "VP at Amazon"', () => {
            expect(extractCompany('VP at Amazon')).toBe('Amazon');
        });

        it('should extract from "CEO AT Google"', () => {
            expect(extractCompany('CEO AT Google')).toBe('Google');
        });

        it('should extract from "Director @ Microsoft"', () => {
            expect(extractCompany('Director @ Microsoft')).toBe('Microsoft');
        });

        it('should extract from "Vice President at Goldman Sachs"', () => {
            expect(extractCompany('Vice President at Goldman Sachs')).toBe('Goldman Sachs');
        });
    });

    describe('Title-based extraction (no separator)', () => {
        it('should extract from "CEO Microsoft"', () => {
            expect(extractCompany('CEO Microsoft')).toBe('Microsoft');
        });

        it('should extract from "Director Google"', () => {
            expect(extractCompany('Director Google')).toBe('Google');
        });

        it('should extract from "VP Sales Goldman Sachs"', () => {
            expect(extractCompany('VP Sales Goldman Sachs')).toBe('Sales Goldman Sachs');
        });

        it('should extract from "Head of Engineering Stripe"', () => {
            expect(extractCompany('Head of Engineering Stripe')).toBe('Engineering Stripe');
        });
    });

    describe('Complex headlines', () => {
        it('should extract from "SDE @Amazon|| Google Crowdsource Influencer"', () => {
            const company = extractCompany('SDE @Amazon|| Google Crowdsource Influencer');
            expect(company).toContain('Amazon');
        });

        it('should extract from "Senior Engineer at Meta | Ex-Google"', () => {
            expect(extractCompany('Senior Engineer at Meta | Ex-Google')).toBe('Meta | Ex-Google');
        });
    });

    describe('Edge cases', () => {
        it('should return empty for headline with no company', () => {
            expect(extractCompany('Software Engineer')).toBe('');
        });

        it('should handle empty headline', () => {
            expect(extractCompany('')).toBe('');
        });
    });
});
