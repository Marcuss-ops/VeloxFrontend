import React from 'react';
import { FinanceDashboardApp } from '../../components/Finance/FinanceDashboardApp';

interface FinanceViewProps {
    initialTab?: 'revenue' | 'views';
    onTabChange?: (tab: 'revenue' | 'views') => void;
}

const FinanceView: React.FC<FinanceViewProps> = ({ initialTab, onTabChange }) => {
    return <FinanceDashboardApp initialTab={initialTab} onTabChange={onTabChange} />;
};

export default FinanceView;

