import { Component, inject, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Evidence } from '../../interface/evidence.type';
import { evidenceService } from '../../services/evidence.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthenticationService } from '../../services/authentication.service';
import { NotificationService } from '../../services/notifications.service';
import { lastValueFrom, map, take } from 'rxjs';
import { MapInfoWindow, MapMarker } from '@angular/google-maps';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent {
  evidenceService = inject(evidenceService);
  authService = inject(AuthenticationService);
  center = { lat: 25.6866, lng: -100.3161 };
  selectedMarker: any;
  zoom = 11;
  listOfData: Evidence[] = [];
  totEvidence: number = 0;
  evidenceTypeList: any = [];
  totEvidencePending: number = 0;
  totEvidenceReview: number = 0;
  totEvidenceApproved: number = 0;
  totEvidenceReject: number = 0;
  totEvidenceFinalize: number = 0;
  selectEvidenceType: string = 'Todos';
  selectWorkEvidenceType: string = 'Todos';
  allData: Evidence[] = [];
  currentStatus: string = 'ALL';
  filteredData: Evidence[] = [];
  filteredDataFilter: Evidence[] = [];
  evidenceWorkTypeList: any = [];
  user: any;
  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;
  @ViewChildren(MapMarker) mapMarkers!: QueryList<MapMarker>


  constructor(private message: NzMessageService, private notificationService: NotificationService) {

    this.authService.user.subscribe((user: any) => {
      if (user) {
        this.user = user;
        this.loadEvidences(this.user.customerId);
        this.LoadEvidenceType(this.user.customerId);
        this.LoadEvidenceWorkType(this.user.customerId);
      } else {
        this.user = [];
      }
    });
  }

  ngOnInit() {
    this.filteredData = this.listOfData; // Mostrar todos al inicio
    this.filteredDataFilter = this.listOfData;
  }

  LoadEvidenceWorkType(customerId: string) {
    this.evidenceService.getEvidenceWorkType(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((evidenceList: any[]) => {
      this.evidenceWorkTypeList = evidenceList;
    });
  }

  loadEvidences(customerId: string) {
    this.evidenceService.getEvidence(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((evidenceList: Evidence[]) => {
      this.listOfData = evidenceList;
      this.filteredData = this.listOfData;
      this.allData = evidenceList;
      this.filteredDataFilter = this.filteredData;
      this.updatePendingCount();

    });
  }

  LoadEvidenceType(customerId: string) {
    this.evidenceService.getEvidenceType(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((evidenceList: Evidence[]) => {
      this.evidenceTypeList = evidenceList;
    });
  }
  selectEvidenceTypeOption() {
    this.filteredData = this.filteredDataFilter.filter((r: any) =>
      r.evidenceTypeUid.trim() === this.selectEvidenceType.trim()
    );
  }
  filterPending(): void {
    this.currentStatus = 'PENDING';
    this.applyFilters();
  }

  filterApproved(): void {
    this.currentStatus = 'APPROVED';
    this.applyFilters();
  }

  filterReview(): void {
    this.currentStatus = 'REVIEW';
    this.applyFilters();
  }

  filterReject(): void {
    this.currentStatus = 'REJECT';
    this.applyFilters();
  }

  filterFinalized(): void {
    this.currentStatus = 'FINALIZED';
    this.applyFilters();
  }

  filterTot(): void {
    this.currentStatus = 'ALL';
    this.applyFilters();
  }

  updatePendingCount(): void {
    this.totEvidencePending = this.listOfData.filter(item => item.status === 'PENDING').length;
    this.totEvidence = this.listOfData.length;
    this.totEvidenceReview = this.listOfData.filter(item => item.status === 'REVIEW').length;
    this.totEvidenceApproved = this.listOfData.filter(item => item.status === 'APPROVED').length;
    this.totEvidenceReject = this.listOfData.filter(item => item.status === 'REJECT').length;
    this.totEvidenceFinalize = this.listOfData.filter(item => item.status === 'FINALIZED').length;
  }

  showInfoWindow(index: number, item: any) {
    const markerArray = this.mapMarkers.toArray();
    const marker = markerArray[index];
    if (marker) {
      this.selectedMarker = item;
      this.infoWindow.open(marker);
    } else {
      console.error("No se encontró el marcador en el índice:", index);
    }
  }

  formatDate(value: any): Date | null {
    if (!value) return null;

    // Firestore Timestamp
    if (value.toDate) return value.toDate();

    // Si ya es Date
    if (value instanceof Date) return value;

    // Si es string o número
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  applyFilters() {
    this.filteredData = this.allData.filter((r: any) => {
      const matchEvidenceType =
        this.selectEvidenceType === 'Todos' ||
        r.evidenceTypeUid?.trim() === this.selectEvidenceType?.trim();

      const matchWorkEvidenceType =
        this.selectWorkEvidenceType === 'Todos' ||
        r.evidenceWorkTypeUid?.trim() === this.selectWorkEvidenceType?.trim();

      const matchStatus =
        this.currentStatus === 'ALL' || r.status === this.currentStatus;

      return matchEvidenceType && matchWorkEvidenceType && matchStatus;
    });
  }
}
