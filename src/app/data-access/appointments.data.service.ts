import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RawPraxisFile } from '../core/domain/models/appointment.model';

/** Loads the raw practice dataset from the static `public/data` folder. */
@Injectable({ providedIn: 'root' })
export class AppointmentsDataService {
  private readonly http = inject(HttpClient);
  private readonly url = 'data/termindaten_beispiel.json';

  loadRaw(): Observable<RawPraxisFile> {
    return this.http.get<RawPraxisFile>(this.url);
  }
}
