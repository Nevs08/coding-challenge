import { Routes } from '@angular/router';
import { HomeComponent } from './sites/home/home.component';
import { ResultComponent } from './sites/result/result.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        pathMatch: 'full'
    },
    {
        path: 'result',
        component: ResultComponent,
        pathMatch: 'full'
    },
    {
        path: '**',
        component: HomeComponent
    }
];
