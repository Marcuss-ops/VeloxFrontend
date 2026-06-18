import React from 'react';
import { WorkersDashboardApp } from '../../components/Workers/WorkersDashboardApp';
import { WorkersTab } from '../../components/Workers/types';

interface WorkersViewProps {
    initialTab?: WorkersTab;
    onTabChange?: (tab: WorkersTab) => void;
}

const WorkersView: React.FC<WorkersViewProps> = ({ initialTab, onTabChange }) => {
    return <WorkersDashboardApp initialTab={initialTab} onTabChange={onTabChange} />;
};

export default WorkersView;

